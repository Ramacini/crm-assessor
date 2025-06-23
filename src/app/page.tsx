'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Client {
  id: string
  user_id: string
  company_id?: string
  name: string
  email: string
  phone?: string
  company?: string
  aum_value?: number
  priority: string
  pipeline_stage: string
  risk_profile?: string
  notes?: string
  created_at: string
  user_profiles?: {
    name?: string
    email: string
  }
}

interface Activity {
  id: string
  user_id: string
  company_id?: string
  client_id: string
  type: string
  title: string
  description?: string
  completed: boolean
  scheduled_date?: string
  completed_date?: string
  created_at: string
  clients?: {
    name: string
  }
  user_profiles?: {
    name?: string
    email: string
  }
}

interface Opportunity {
  id: string
  user_id: string
  company_id?: string
  funnel_type: string
  name: string
  email: string
  phone?: string
  company?: string
  value?: number
  description?: string
  stage: string
  created_at: string
user_profiles?: {
    name?: string
    email: string
}

interface Company {
  id: string
  name: string
  manager_id: string
  plan_type: string
  created_at: string
}

interface UserProfile {
  id: string
  user_id: string
  company_id?: string
  role: string
  email: string
  name?: string
  created_at: string
}

export default function CRM() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState('landing')
  const [loading, setLoading] = useState(true)

  // User profile and company states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userCompany, setUserCompany] = useState<Company | null>(null)
  const [isCompanyManager, setIsCompanyManager] = useState(false)

  // Data states
  const [clients, setClients] = useState<Client[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([])

  // UI states
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showClientModal, setShowClientModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showOpportunityModal, setShowOpportunityModal] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('all')

  // Form states
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    aum_value: '',
    priority: 'Média prioridade',
    pipeline_stage: 'Qualificação',
    risk_profile: 'Moderado',
    notes: ''
  })

  const [activityData, setActivityData] = useState({
    client_id: '',
    type: 'Ligação',
    title: '',
    description: '',
    scheduled_date: ''
  })

  const [opportunityData, setOpportunityData] = useState({
    funnel_type: 'Consórcio',
    name: '',
    email: '',
    phone: '',
    company: '',
    value: '',
    description: '',
    stage: 'Qualificação'
  })

  const [companyData, setCompanyData] = useState({
    name: '',
    plan_type: 'escritorio'
  })

  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    role: 'assessor'
  })

  // Auth states
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    accountType: 'individual'
  })

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })

  // Check authentication on load
  useEffect(() => {
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await loadUserProfile(session.user.id)
        setCurrentPage('dashboard')
      } else {
        setUser(null)
        setUserProfile(null)
        setUserCompany(null)
        setCurrentPage('landing')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load data when user changes
  useEffect(() => {
    if (user && userProfile) {
      fetchClients()
      fetchActivities()
      fetchOpportunities()
      if (isCompanyManager) {
        fetchTeamMembers()
      }
    }
  }, [user, userProfile, isCompanyManager])

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await loadUserProfile(session.user.id)
        setCurrentPage('dashboard')
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId: string) => {
    try {
      // Try to get existing profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          companies (
            id,
            name,
            manager_id,
            plan_type
          )
        `)
        .eq('user_id', userId)
        .single()

      if (profile) {
        setUserProfile(profile)
        if (profile.companies) {
          setUserCompany(profile.companies)
          setIsCompanyManager(profile.companies.manager_id === userId)
        }
      } else {
        // Create basic profile if it doesn't exist
        const { data: userData } = await supabase.auth.getUser()
        const email = userData.user?.email || ''
        
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            email: email,
            role: 'individual'
          })
          .select()
          .single()

        if (newProfile) {
          setUserProfile(newProfile)
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  // Auth functions
  const handleSignUp = async () => {
    try {
      if (authData.password !== authData.confirmPassword) {
        alert('Senhas não coincidem!')
        return
      }

      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: {
          data: {
            name: authData.name
          }
        }
      })

      if (authError) {
        alert('Erro no cadastro: ' + authError.message)
        return
      }

      if (signUpData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: signUpData.user.id,
            email: authData.email,
            name: authData.name,
            role: authData.accountType === 'individual' ? 'individual' : 'manager'
          })

        if (profileError) {
          console.error('Error creating profile:', profileError)
        }

        alert('Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.')
        setCurrentPage('login')
        resetAuthForm()
      }
    } catch (error) {
      console.error('Error during sign up:', error)
      alert('Erro durante o cadastro')
    }
  }

  const handleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      })

      if (error) {
        alert('Erro no login: ' + error.message)
        return
      }

      if (data.user) {
        setUser(data.user)
        await loadUserProfile(data.user.id)
        setCurrentPage('dashboard')
        setLoginData({ email: '', password: '' })
      }
    } catch (error) {
      console.error('Error during sign in:', error)
      alert('Erro durante o login')
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserProfile(null)
      setUserCompany(null)
      setCurrentPage('landing')
      setClients([])
      setActivities([])
      setOpportunities([])
      setTeamMembers([])
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Company management functions
  const handleCreateCompany = async () => {
    if (!user) return

    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyData.name,
          manager_id: user.id,
          plan_type: companyData.plan_type
        })
        .select()
        .single()

      if (companyError) {
        alert('Erro ao criar empresa: ' + companyError.message)
        return
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          company_id: company.id,
          role: 'manager'
        })
        .eq('user_id', user.id)

      if (profileError) {
        alert('Erro ao atualizar perfil: ' + profileError.message)
        return
      }

      setUserCompany(company)
      setIsCompanyManager(true)
      setShowCompanyModal(false)
      setCompanyData({ name: '', plan_type: 'escritorio' })
      await loadUserProfile(user.id)
      alert('Empresa criada com sucesso!')
    } catch (error) {
      console.error('Error creating company:', error)
      alert('Erro ao criar empresa')
    }
  }

  const handleInviteUser = async () => {
    if (!user || !userCompany) return

    try {
      // For demo purposes, we'll create a user profile directly
      // In production, you'd send an actual invitation email
      const { data: newProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: `temp_${Date.now()}`, // Temporary ID for demo
          company_id: userCompany.id,
          email: inviteData.email,
          name: inviteData.name,
          role: inviteData.role
        })
        .select()
        .single()

      if (profileError) {
        alert('Erro ao convidar usuário: ' + profileError.message)
        return
      }

      setShowInviteModal(false)
      setInviteData({ email: '', name: '', role: 'assessor' })
      fetchTeamMembers()
      alert('Convite enviado com sucesso!')
    } catch (error) {
      console.error('Error inviting user:', error)
      alert('Erro ao enviar convite')
    }
  }

  // Data fetching functions
  const fetchClients = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)

      // If user is a company manager, get all company clients
      if (isCompanyManager && userCompany) {
        query = supabase
          .from('clients')
          .select(`
            *,
            user_profiles!clients_user_id_fkey (
              name,
              email
            )
          `)
          .eq('company_id', userCompany.id)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching clients:', error)
        return
      }

      setClients(data || [])
    } catch (error) {
      console.error('Error in fetchClients:', error)
    }
  }

  const fetchActivities = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('activities')
        .select(`
          *,
          clients!activities_client_id_fkey (
            name
          )
        `)
        .eq('user_id', user.id)

      // If user is a company manager, get all company activities
      if (isCompanyManager && userCompany) {
        query = supabase
          .from('activities')
          .select(`
            *,
            clients!activities_client_id_fkey (
              name
            ),
            user_profiles!activities_user_id_fkey (
              name,
              email
            )
          `)
          .eq('company_id', userCompany.id)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching activities:', error)
        return
      }

      setActivities(data || [])
    } catch (error) {
      console.error('Error in fetchActivities:', error)
    }
  }

  const fetchOpportunities = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('opportunities')
        .select('*')
        .eq('user_id', user.id)

      // If user is a company manager, get all company opportunities
      if (isCompanyManager && userCompany) {
        query = supabase
          .from('opportunities')
          .select(`
            *,
            user_profiles!opportunities_user_id_fkey (
              name,
              email
            )
          `)
          .eq('company_id', userCompany.id)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching opportunities:', error)
        return
      }

      setOpportunities(data || [])
    } catch (error) {
      console.error('Error in fetchOpportunities:', error)
    }
  }

  const fetchTeamMembers = async () => {
    if (!userCompany) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('company_id', userCompany.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching team members:', error)
        return
      }

      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error in fetchTeamMembers:', error)
    }
  }

  // CRUD functions for clients
  const handleClientSubmit = async () => {
    if (!user) return

    try {
      const clientPayload = {
        user_id: user.id,
        company_id: userCompany?.id || null,
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        company: clientData.company,
        aum_value: clientData.aum_value ? parseFloat(clientData.aum_value) : null,
        priority: clientData.priority,
        pipeline_stage: clientData.pipeline_stage,
        risk_profile: clientData.risk_profile,
        notes: clientData.notes
      }

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientPayload)
          .eq('id', editingClient.id)
          .eq('user_id', user.id)

        if (error) {
          alert('Erro ao atualizar prospect: ' + error.message)
          return
        }
        alert('Prospect atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientPayload)

        if (error) {
          alert('Erro ao cadastrar prospect: ' + error.message)
          return
        }
        alert('Prospect cadastrado com sucesso!')
      }

      setShowClientModal(false)
      resetClientForm()
      fetchClients()
    } catch (error) {
      console.error('Error in handleClientSubmit:', error)
      alert('Erro ao processar prospect')
    }
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setClientData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      aum_value: client.aum_value?.toString() || '',
      priority: client.priority,
      pipeline_stage: client.pipeline_stage,
      risk_profile: client.risk_profile || 'Moderado',
      notes: client.notes || ''
    })
    setShowClientModal(true)
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!user) return
    
    if (confirm('Tem certeza que deseja excluir este prospect?')) {
      try {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', clientId)
          .eq('user_id', user.id)

        if (error) {
          alert('Erro ao excluir prospect: ' + error.message)
          return
        }

        alert('Prospect excluído com sucesso!')
        fetchClients()
      } catch (error) {
        console.error('Error deleting client:', error)
        alert('Erro ao excluir prospect')
      }
    }
  }

  const movePipelineStage = async (clientId: string, direction: 'next' | 'prev') => {
    if (!user) return

    const stages = ['Qualificação', '1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação']
    const client = clients.find(c => c.id === clientId)
    if (!client) return

    const currentIndex = stages.indexOf(client.pipeline_stage)
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1

    if (newIndex < 0 || newIndex >= stages.length) return

    try {
      const { error } = await supabase
        .from('clients')
        .update({ pipeline_stage: stages[newIndex] })
        .eq('id', clientId)
        .eq('user_id', user.id)

      if (error) {
        alert('Erro ao mover prospect no pipeline: ' + error.message)
        return
      }

      fetchClients()
    } catch (error) {
      console.error('Error moving pipeline stage:', error)
    }
  }

  // CRUD functions for activities
  const handleActivitySubmit = async () => {
    if (!user) return

    try {
      const activityPayload = {
        user_id: user.id,
        company_id: userCompany?.id || null,
        client_id: activityData.client_id,
        type: activityData.type,
        title: activityData.title,
        description: activityData.description,
        completed: false,
        scheduled_date: activityData.scheduled_date || null
      }

      if (editingActivity) {
        const { error } = await supabase
          .from('activities')
          .update(activityPayload)
          .eq('id', editingActivity.id)
          .eq('user_id', user.id)

        if (error) {
          alert('Erro ao atualizar atividade: ' + error.message)
          return
        }
        alert('Atividade atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('activities')
          .insert(activityPayload)

        if (error) {
          alert('Erro ao cadastrar atividade: ' + error.message)
          return
        }
        alert('Atividade cadastrada com sucesso!')
      }

      setShowActivityModal(false)
      resetActivityForm()
      fetchActivities()
    } catch (error) {
      console.error('Error in handleActivitySubmit:', error)
      alert('Erro ao processar atividade')
    }
  }

  const toggleActivityCompletion = async (activityId: string, completed: boolean) => {
    if (!user) return

    try {
      const updateData: any = { completed: !completed }
      if (!completed) {
        updateData.completed_date = new Date().toISOString()
      } else {
        updateData.completed_date = null
      }

      const { error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', activityId)
        .eq('user_id', user.id)

      if (error) {
        alert('Erro ao atualizar atividade: ' + error.message)
        return
      }

      fetchActivities()
    } catch (error) {
      console.error('Error toggling activity:', error)
    }
  }

  // CRUD functions for opportunities
  const handleOpportunitySubmit = async () => {
    if (!user) return

    try {
      const opportunityPayload = {
        user_id: user.id,
        company_id: userCompany?.id || null,
        funnel_type: opportunityData.funnel_type,
        name: opportunityData.name,
        email: opportunityData.email,
        phone: opportunityData.phone,
        company: opportunityData.company,
        value: opportunityData.value ? parseFloat(opportunityData.value) : null,
        description: opportunityData.description,
        stage: opportunityData.stage
      }

      const { error } = await supabase
        .from('opportunities')
        .insert(opportunityPayload)

      if (error) {
        alert('Erro ao cadastrar oportunidade: ' + error.message)
        return
      }

      alert('Oportunidade cadastrada com sucesso!')
      setShowOpportunityModal(false)
      resetOpportunityForm()
      fetchOpportunities()
    } catch (error) {
      console.error('Error in handleOpportunitySubmit:', error)
      alert('Erro ao processar oportunidade')
    }
  }

  const moveOpportunityStage = async (opportunityId: string, direction: 'next' | 'prev') => {
    if (!user) return

    const stages = ['Qualificação', '1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação']
    const opportunity = opportunities.find(o => o.id === opportunityId)
    if (!opportunity) return

    const currentIndex = stages.indexOf(opportunity.stage)
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1

    if (newIndex < 0 || newIndex >= stages.length) return

    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ stage: stages[newIndex] })
        .eq('id', opportunityId)
        .eq('user_id', user.id)

      if (error) {
        alert('Erro ao mover oportunidade no pipeline: ' + error.message)
        return
      }

      fetchOpportunities()
    } catch (error) {
      console.error('Error moving opportunity stage:', error)
    }
  }

  // Helper functions
  const resetClientForm = () => {
    setClientData({
      name: '',
      email: '',
      phone: '',
      company: '',
      aum_value: '',
      priority: 'Média prioridade',
      pipeline_stage: 'Qualificação',
      risk_profile: 'Moderado',
      notes: ''
    })
    setEditingClient(null)
  }

  const resetActivityForm = () => {
    setActivityData({
      client_id: '',
      type: 'Ligação',
      title: '',
      description: '',
      scheduled_date: ''
    })
    setEditingActivity(null)
  }

  const resetOpportunityForm = () => {
    setOpportunityData({
      funnel_type: 'Consórcio',
      name: '',
      email: '',
      phone: '',
      company: '',
      value: '',
      description: '',
      stage: 'Qualificação'
    })
  }

  const resetAuthForm = () => {
    setAuthData({
      email: '',
      password: '',
      name: '',
      confirmPassword: '',
      accountType: 'individual'
    })
  }

  // Filtering and calculations
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = selectedPriority === 'all' || client.priority === selectedPriority
    return matchesSearch && matchesPriority
  })

  const getOpportunitiesByFunnel = (funnelType: string) => {
    return opportunities.filter(opp => opp.funnel_type === funnelType)
  }

  const getKPIs = () => {
    const totalClients = clients.length
    const totalActivities = activities.length
    const completedActivities = activities.filter(activity => activity.completed).length
    const totalAUM = clients.reduce((sum, client) => sum + (client.aum_value || 0), 0)
    const conversionRate = totalClients > 0 ? 
      (clients.filter(client => client.pipeline_stage === 'Ativação').length / totalClients * 100).toFixed(1) : '0'

    return {
      totalClients,
      totalActivities,
      completedActivities,
      totalAUM,
      conversionRate
    }
  }

  const getTeamKPIs = () => {
    if (!isCompanyManager) return null

    const totalTeamClients = clients.length
    const totalTeamActivities = activities.length
    const totalTeamAUM = clients.reduce((sum, client) => sum + (client.aum_value || 0), 0)
    const teamMembersCount = teamMembers.length

    return {
      totalTeamClients,
      totalTeamActivities,
      totalTeamAUM,
      teamMembers: teamMembersCount
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-yellow-400 text-lg">Carregando...</p>
        </div>
      </div>
    )
  }

  // Landing Page
  if (currentPage === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {/* Header */}
        <header className="relative z-10 bg-black/50 backdrop-blur-lg border-b border-yellow-400/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-xl">C</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                  CRM do Assessor
                </h1>
              </div>
              <div className="space-x-4">
                <button
                  onClick={() => setCurrentPage('login')}
                  className="px-6 py-2 bg-transparent border-2 border-yellow-400 text-yellow-400 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-300 font-semibold"
                >
                  Entrar
                </button>
                <button
                  onClick={() => setCurrentPage('signup')}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300 font-semibold"
                >
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                O CRM que
                <span className="block bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                  Turbina suas Vendas
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Mais de 1.500+ assessores e consultores já confiam em nossa plataforma para gerenciar prospects, 
                atividades e aumentar suas conversões em até 300%.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setCurrentPage('signup')}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300 font-semibold text-lg"
                >
                  Comece Grátis Agora
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="mt-20 grid md:grid-cols-3 gap-8">
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-black text-xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Pipeline Visual</h3>
                <p className="text-gray-400">Funil de prospecção interativo com drag & drop</p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-black text-xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Automações</h3>
                <p className="text-gray-400">Follow-ups automáticos e lembretes inteligentes</p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-black text-xl">📈</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Relatórios</h3>
                <p className="text-gray-400">Analytics avançados e métricas de performance</p>
              </div>
            </div>

            {/* Pricing */}
            <div className="mt-20">
              <h2 className="text-3xl font-bold text-center text-white mb-12">
                Escolha seu Plano
              </h2>
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/10">
                  <h3 className="text-2xl font-bold text-white mb-4">Essencial</h3>
                  <p className="text-4xl font-bold text-yellow-400 mb-6">R$ 47<span className="text-lg text-gray-400">/mês</span></p>
                  <ul className="space-y-3 text-gray-300 mb-8">
                    <li>✓ Nível básico</li>
                    <li>✓ Pipeline essencial + atividades</li>
                    <li>✓ Relatórios básicos</li>
                    <li>✓ Suporte por email</li>
                  </ul>
                  <button className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-lg font-semibold hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300">
                    Começar Agora
                  </button>
                </div>
                <div className="bg-gradient-to-b from-yellow-400/20 to-yellow-600/20 backdrop-blur-lg rounded-xl p-8 border-2 border-yellow-400 relative">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-semibold">
                      MAIS POPULAR
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Profissional</h3>
                  <p className="text-4xl font-bold text-yellow-400 mb-6">R$ 37<span className="text-lg text-gray-400">/mês</span></p>
                  <ul className="space-y-3 text-gray-300 mb-8">
                    <li>✓ Nível avançado</li>
                    <li>✓ Automações + relatórios + integrações</li>
                    <li>✓ Relatórios avançados</li>
                    <li>✓ Suporte prioritário</li>
                  </ul>
                  <button className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-lg font-semibold hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300">
                    Começar Agora
                  </button>
                </div>
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/10">
                  <h3 className="text-2xl font-bold text-white mb-4">Enterprise</h3>
                  <p className="text-4xl font-bold text-yellow-400 mb-6">R$ 197<span className="text-lg text-gray-400">/mês</span></p>
                  <ul className="space-y-3 text-gray-300 mb-8">
                    <li>✓ Recursos ilimitados</li>
                    <li>✓ Gestão de equipes</li>
                    <li>✓ White label</li>
                    <li>✓ Suporte dedicado</li>
                  </ul>
                  <button className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-lg font-semibold hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300">
                    Falar com Vendas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Login Page
  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta</h2>
            <p className="text-gray-400">Entre na sua conta para continuar</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={handleSignIn}
              className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-lg font-semibold hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300"
            >
              Entrar
            </button>

            <div className="text-center">
              <p className="text-gray-400">
                Não tem uma conta?{' '}
                <button
                  onClick={() => setCurrentPage('signup')}
                  className="text-yellow-400 hover:text-yellow-300 font-semibold"
                >
                  Cadastre-se
                </button>
              </p>
              <button
                onClick={() => setCurrentPage('landing')}
                className="text-gray-400 hover:text-white mt-2 block mx-auto"
              >
                ← Voltar ao início
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Signup Page  
  if (currentPage === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Criar Conta</h2>
            <p className="text-gray-400">Comece a turbinar suas vendas hoje</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={authData.name}
                onChange={(e) => setAuthData({...authData, name: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={authData.email}
                onChange={(e) => setAuthData({...authData, email: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Conta
              </label>
              <select
                value={authData.accountType}
                onChange={(e) => setAuthData({...authData, accountType: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              >
                <option value="individual">Assessor Individual</option>
                <option value="manager">Gestor de Equipe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={authData.password}
                onChange={(e) => setAuthData({...authData, password: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={authData.confirmPassword}
                onChange={(e) => setAuthData({...authData, confirmPassword: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={handleSignUp}
              className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-lg font-semibold hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300"
            >
              Criar Conta
            </button>

            <div className="text-center">
              <p className="text-gray-400">
                Já tem uma conta?{' '}
                <button
                  onClick={() => setCurrentPage('login')}
                  className="text-yellow-400 hover:text-yellow-300 font-semibold"
                >
                  Faça login
                </button>
              </p>
              <button
                onClick={() => setCurrentPage('landing')}
                className="text-gray-400 hover:text-white mt-2 block mx-auto"
              >
                ← Voltar ao início
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard
  const kpis = getKPIs()
  const teamKPIs = getTeamKPIs()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-lg border-b border-yellow-400/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                <span className="text-black font-bold">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {userCompany ? userCompany.name : 'CRM do Assessor'}
                </h1>
                {userProfile && (
                  <p className="text-sm text-gray-400">
                    {userProfile.name || userProfile.email} 
                    {isCompanyManager && ' (Gestor)'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {userProfile?.role === 'manager' && !userCompany && (
                <button
                  onClick={() => setShowCompanyModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300"
                >
                  Criar Empresa
                </button>
              )}

              {isCompanyManager && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                >
                  Convidar Assessor
                </button>
              )}

              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {['dashboard', 'prospects', 'atividades', 'consorcio', 'seguros', 'cambio', 'eventos', ...(isCompanyManager ? ['equipe'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-yellow-400 text-yellow-400'
                    : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
                }`}
              >
                {tab === 'prospects' && '👥 Prospects'}
                {tab === 'atividades' && '📋 Atividades'}
                {tab === 'consorcio' && '🏠 Consórcio'}
                {tab === 'seguros' && '🛡️ Seguros'}
                {tab === 'cambio' && '💱 Câmbio'}
                {tab === 'eventos' && '🎯 Eventos'}
                {tab === 'dashboard' && '📊 Dashboard'}
                {tab === 'equipe' && '👥 Minha Equipe'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                {isCompanyManager ? 'Dashboard da Empresa' : 'Dashboard'}
              </h2>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-gray-300">Total de Prospects</h3>
                <p className="text-3xl font-bold text-yellow-400">{kpis.totalClients}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-gray-300">Atividades</h3>
                <p className="text-3xl font-bold text-blue-400">{kpis.completedActivities}/{kpis.totalActivities}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-gray-300">AUM Total</h3>
                <p className="text-3xl font-bold text-green-400">R$ {kpis.totalAUM.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-gray-300">Taxa de Conversão</h3>
                <p className="text-3xl font-bold text-purple-400">{kpis.conversionRate}%</p>
              </div>
            </div>

            {/* Team KPIs for Managers */}
            {isCompanyManager && teamKPIs && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Métricas da Equipe</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 backdrop-blur-lg rounded-xl p-6 border border-blue-400/20">
                    <h4 className="text-lg font-semibold text-gray-300">Membros da Equipe</h4>
                    <p className="text-3xl font-bold text-blue-400">{teamMembers.length}</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-xl p-6 border border-green-400/20">
                    <h4 className="text-lg font-semibold text-gray-300">Prospects da Equipe</h4>
                    <p className="text-3xl font-bold text-green-400">{teamKPIs.totalTeamClients}</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 backdrop-blur-lg rounded-xl p-6 border border-purple-400/20">
                    <h4 className="text-lg font-semibold text-gray-300">Atividades da Equipe</h4>
                    <p className="text-3xl font-bold text-purple-400">{teamKPIs.totalTeamActivities}</p>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-lg rounded-xl p-6 border border-yellow-400/20">
                    <h4 className="text-lg font-semibold text-gray-300">AUM da Equipe</h4>
                    <p className="text-3xl font-bold text-yellow-400">R$ {teamKPIs.totalTeamAUM.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pipeline Overview */}
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6">Pipeline de Prospecção</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {['Qualificação', '1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação'].map((stage) => {
                  const stageClients = clients.filter(client => client.pipeline_stage === stage)
                  return (
                    <div key={stage} className="bg-black/30 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">{stage}</h4>
                      <p className="text-2xl font-bold text-yellow-400">{stageClients.length}</p>
                      <div className="mt-2 space-y-1">
                        {stageClients.slice(0, 3).map((client) => (
                          <div key={client.id} className="text-xs text-gray-400 truncate">
                            {client.name}
                          </div>
                        ))}
                        {stageClients.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{stageClients.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Prospects Tab */}
        {activeTab === 'prospects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Prospects</h2>
              <button
                onClick={() => setShowClientModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300 font-semibold"
              >
                + Novo Prospect
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar prospects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">Todas as Prioridades</option>
                <option value="Alta prioridade">Alta prioridade</option>
                <option value="Média prioridade">Média prioridade</option>
                <option value="Baixa prioridade">Baixa prioridade</option>
              </select>
            </div>

            {/* Prospects Table */}
            <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Prioridade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Pipeline</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">AUM</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{client.name}</div>
                          {isCompanyManager && client.user_profiles && (
                            <div className="text-xs text-gray-400">
                              Assessor: {client.user_profiles.name || client.user_profiles.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{client.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            client.priority === 'Alta prioridade' ? 'bg-red-100 text-red-800' :
                            client.priority === 'Média prioridade' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {client.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => movePipelineStage(client.id, 'prev')}
                              className="p-1 text-gray-400 hover:text-white"
                              disabled={client.pipeline_stage === 'Qualificação'}
                            >
                              ←
                            </button>
                            <span className="text-sm text-gray-300">{client.pipeline_stage}</span>
                            <button
                              onClick={() => movePipelineStage(client.id, 'next')}
                              className="p-1 text-gray-400 hover:text-white"
                              disabled={client.pipeline_stage === 'Ativação'}
                            >
                              →
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          R$ {(client.aum_value || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEditClient(client)}
                            className="text-yellow-400 hover:text-yellow-300"
                          >
                            Editar
                          </button>
                          {!isCompanyManager && (
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Excluir
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredClients.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">Nenhum prospect encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'atividades' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Atividades</h2>
              <button
                onClick={() => setShowActivityModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold"
              >
                + Nova Atividade
              </button>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Atividade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Prospect</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {activities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{activity.title}</div>
                          {activity.description && (
                            <div className="text-sm text-gray-400">{activity.description}</div>
                          )}
                          {isCompanyManager && activity.user_profiles && (
                            <div className="text-xs text-gray-500 mt-1">
                              por {activity.user_profiles.name || activity.user_profiles.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {activity.clients?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{activity.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {activity.scheduled_date ? new Date(activity.scheduled_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleActivityCompletion(activity.id, activity.completed)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              activity.completed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {activity.completed ? 'Concluída' : 'Pendente'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {activities.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">Nenhuma atividade encontrada</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Funnel Tabs (Consórcio, Seguros, Câmbio, Eventos) */}
        {['consorcio', 'seguros', 'cambio', 'eventos'].includes(activeTab) && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white capitalize">{activeTab}</h2>
              <button
                onClick={() => {
                  setOpportunityData({...opportunityData, funnel_type: activeTab.charAt(0).toUpperCase() + activeTab.slice(1)})
                  setShowOpportunityModal(true)
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 font-semibold"
              >
                + Nova Oportunidade
              </button>
            </div>

            {/* Pipeline Visual for Current Funnel */}
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6">Pipeline - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {['Qualificação', '1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação'].map((stage) => {
                  const stageOpportunities = getOpportunitiesByFunnel(activeTab.charAt(0).toUpperCase() + activeTab.slice(1)).filter(opp => opp.stage === stage)
                  return (
                    <div key={stage} className="bg-black/30 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">{stage}</h4>
                      <p className="text-2xl font-bold text-purple-400">{stageOpportunities.length}</p>
                      <div className="mt-3 space-y-2">
                        {stageOpportunities.map((opportunity) => (
                          <div key={opportunity.id} className="bg-white/10 rounded p-2">
                            <div className="text-sm font-medium text-white truncate">{opportunity.name}</div>
                            <div className="text-xs text-gray-400 truncate">{opportunity.email}</div>
                            {opportunity.value && (
                              <div className="text-xs text-green-400">R$ {opportunity.value.toLocaleString()}</div>
                            )}
                            <div className="flex justify-between items-center mt-2">
                              <button
                                onClick={() => moveOpportunityStage(opportunity.id, 'prev')}
                                className="text-xs text-gray-400 hover:text-white"
                                disabled={opportunity.stage === 'Qualificação'}
                              >
                                ←
                              </button>
                              <button
                                onClick={() => moveOpportunityStage(opportunity.id, 'next')}
                                className="text-xs text-gray-400 hover:text-white"
                                disabled={opportunity.stage === 'Ativação'}
                              >
                                →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Opportunities List */}
            <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Etapa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {getOpportunitiesByFunnel(activeTab.charAt(0).toUpperCase() + activeTab.slice(1)).map((opportunity) => (
                      <tr key={opportunity.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{opportunity.name}</div>
                          {isCompanyManager && opportunity.user_profiles && (
                            <div className="text-xs text-gray-400">
                              Assessor: {opportunity.user_profiles.name || opportunity.user_profiles.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{opportunity.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{opportunity.stage}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {opportunity.value ? `R$ ${opportunity.value.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(opportunity.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {getOpportunitiesByFunnel(activeTab.charAt(0).toUpperCase() + activeTab.slice(1)).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">Nenhuma oportunidade encontrada para {activeTab}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Management Tab (Only for Managers) */}
        {activeTab === 'equipe' && isCompanyManager && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Gestão da Equipe</h2>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold"
              >
                + Convidar Assessor
              </button>
            </div>

            {/* Team Members */}
            <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Membros da Equipe</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Função</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Prospects</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Atividades</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">AUM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {teamMembers.map((member) => {
                      const memberClients = clients.filter(c => c.user_id === member.user_id)
                      const memberActivities = activities.filter(a => a.user_id === member.user_id)
                      const memberAUM = memberClients.reduce((sum, client) => sum + (client.aum_value || 0), 0)
                      
                      return (
                        <tr key={member.id} className="hover:bg-white/5">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {member.name || 'Usuário Convidado'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {member.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              member.role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {member.role === 'manager' ? 'Gestor' : 'Assessor'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {memberClients.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {memberActivities.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            R$ {memberAUM.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {teamMembers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">Nenhum membro na equipe ainda</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">
                {editingClient ? 'Editar Prospect' : 'Novo Prospect'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome do prospect</label>
                  <input
                    type="text"
                    value={clientData.name}
                    onChange={(e) => setClientData({...clientData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Nome do prospect"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email do prospect</label>
                  <input
                    type="email"
                    value={clientData.email}
                    onChange={(e) => setClientData({...clientData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Email do prospect"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={clientData.phone}
                    onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Telefone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Prioridade</label>
                  <select
                    value={clientData.priority}
                    onChange={(e) => setClientData({...clientData, priority: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="Baixa prioridade">Baixa prioridade</option>
                    <option value="Média prioridade">Média prioridade</option>
                    <option value="Alta prioridade">Alta prioridade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Etapa do Pipeline</label>
                  <select
                    value={clientData.pipeline_stage}
                    onChange={(e) => setClientData({...clientData, pipeline_stage: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="Qualificação">Qualificação</option>
                    <option value="1ª Reunião">1ª Reunião</option>
                    <option value="2ª Reunião">2ª Reunião</option>
                    <option value="Cadastro">Cadastro</option>
                    <option value="Ativação">Ativação</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">AUM (R$)</label>
                  <input
                    type="number"
                    value={clientData.aum_value}
                    onChange={(e) => setClientData({...clientData, aum_value: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Valor em Reais"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                  <textarea
                    value={clientData.notes}
                    onChange={(e) => setClientData({...clientData, notes: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    rows={3}
                    placeholder="Observações sobre o prospect"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowClientModal(false)
                    resetClientForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClientSubmit}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-300 font-semibold"
                >
                  {editingClient ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Nova Atividade</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Prospect</label>
                  <select
                    value={activityData.client_id}
                    onChange={(e) => setActivityData({...activityData, client_id: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Selecionar prospect</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                  <select
                    value={activityData.type}
                    onChange={(e) => setActivityData({...activityData, type: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="Ligação">Ligação</option>
                    <option value="Email">Email</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Apresentação">Apresentação</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Título</label>
                  <input
                    type="text"
                    value={activityData.title}
                    onChange={(e) => setActivityData({...activityData, title: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Título da atividade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                  <textarea
                    value={activityData.description}
                    onChange={(e) => setActivityData({...activityData, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    rows={3}
                    placeholder="Descrição da atividade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Data Agendada</label>
                  <input
                    type="datetime-local"
                    value={activityData.scheduled_date}
                    onChange={(e) => setActivityData({...activityData, scheduled_date: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowActivityModal(false)
                    resetActivityForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleActivitySubmit}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold"
                >
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Modal */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Nova Oportunidade</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Funil</label>
                  <select
                    value={opportunityData.funnel_type}
                    onChange={(e) => setOpportunityData({...opportunityData, funnel_type: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="Consórcio">Consórcio</option>
                    <option value="Seguros">Seguros</option>
                    <option value="Câmbio">Câmbio</option>
                    <option value="Eventos">Eventos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                  <input
                    type="text"
                    value={opportunityData.name}
                    onChange={(e) => setOpportunityData({...opportunityData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Nome do prospect"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={opportunityData.email}
                    onChange={(e) => setOpportunityData({...opportunityData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Email do prospect"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={opportunityData.phone}
                    onChange={(e) => setOpportunityData({...opportunityData, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Telefone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={opportunityData.value}
                    onChange={(e) => setOpportunityData({...opportunityData, value: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Valor em Reais"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                  <textarea
                    value={opportunityData.description}
                    onChange={(e) => setOpportunityData({...opportunityData, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    rows={3}
                    placeholder="Descrição da oportunidade"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowOpportunityModal(false)
                    resetOpportunityForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpportunitySubmit}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 font-semibold"
                >
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Creation Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Criar Empresa</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Empresa</label>
                  <input
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="Nome da empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Plano</label>
                  <select
                    value={companyData.plan_type}
                    onChange={(e) => setCompanyData({...companyData, plan_type: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="escritorio">Escritório (R$ 197/mês)</option>
                    <option value="white_label">White Label (R$ 497/mês)</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCompanyModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCompany}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold"
                >
                  Criar Empresa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Convidar Assessor</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                  <input
                    type="text"
                    value={inviteData.name}
                    onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Nome do assessor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Email do assessor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Função</label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="assessor">Assessor</option>
                    <option value="manager">Gestor</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInviteUser}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold"
                >
                  Enviar Convite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}