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
  risk_profile?: string
  priority: string
  pipeline_stage: string
  created_at?: string
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
  created_at?: string
}

interface Company {
  id: string
  name: string
  logo_url?: string
  primary_color?: string
  secondary_color?: string
  custom_domain?: string
  plan_type: string
  white_label: boolean
  created_at?: string
}

interface TeamMember {
  id: string
  company_id: string
  name: string
  email: string
  role: string
  total_prospects: number
  total_conversions: number
  total_aum: number
  ranking_score: number
}

interface Plan {
  name: string
  price: string
  features: string[]
  highlight?: boolean
  type?: string
}

export default function Home() {
  // Auth states
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userCompany, setUserCompany] = useState<Company | null>(null)
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false)
  
  // Page states
  const [currentPage, setCurrentPage] = useState('landing')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showDemo, setShowDemo] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showClientForm, setShowClientForm] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showClientActivities, setShowClientActivities] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCompanySettings, setShowCompanySettings] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [selectedClientForActivity, setSelectedClientForActivity] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [rankingPeriod, setRankingPeriod] = useState('mensal')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Novos estados para funis específicos
  const [showOpportunityForm, setShowOpportunityForm] = useState(false)
  const [currentFunnel, setCurrentFunnel] = useState('')
  
  // Form states
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    accountType: 'individual', // individual, company, whitelabel
    companyName: '',
    companySize: ''
  })

  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    aum_value: '',
    risk_profile: '',
    priority: 'Média prioridade',
    pipeline_stage: 'Qualificação'
  })

  const [activityData, setActivityData] = useState({
    type: '',
    title: '',
    description: '',
    scheduled_date: ''
  })

  const [opportunityData, setOpportunityData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    value: '',
    description: '',
    stage: 'Qualificação'
  })

  const [companySettings, setCompanySettings] = useState({
    name: '',
    logo_url: '',
    primary_color: '#fbbf24',
    secondary_color: '#f59e0b',
    custom_domain: ''
  })

  // Check auth status on load
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('DEBUG - Session at load:', session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (session?.user) {
        console.log('DEBUG - User at load:', session.user)
        await loadUserCompany(session.user)
        setCurrentPage('dashboard')
      }
    }
    
    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('DEBUG - Auth state change:', event, session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadUserCompany(session.user)
          setCurrentPage('dashboard')
        } else {
          setCurrentPage('landing')
          setUserCompany(null)
          setIsCompanyAdmin(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Load user company info
  const loadUserCompany = async (user: User) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id, role')
        .eq('user_id', user.id)
        .single()

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single()

        setUserCompany(company)
        setIsCompanyAdmin(profile.role === 'admin')
        
        if (company) {
          setCompanySettings({
            name: company.name,
            logo_url: company.logo_url || '',
            primary_color: company.primary_color || '#fbbf24',
            secondary_color: company.secondary_color || '#f59e0b',
            custom_domain: company.custom_domain || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading company:', error)
    }
  }

  // Auth functions
  const handleSignUp = async () => {
    try {
      // First create the user
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: {
          data: {
            name: authData.name,
            account_type: authData.accountType
          }
        }
      })

      if (authError) {
        alert('Erro no cadastro: ' + authError.message)
        return
      }

      // If company account, create company
      if (authData.accountType !== 'individual' && signUpData.user) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: authData.companyName,
            plan_type: authData.accountType,
            white_label: authData.accountType === 'whitelabel'
          })
          .select()
          .single()

        if (companyError) {
          alert('Erro ao criar empresa: ' + companyError.message)
          return
        }

        // Create user profile
        await supabase
          .from('user_profiles')
          .insert({
            user_id: signUpData.user.id,
            company_id: company.id,
            role: 'admin'
          })
      } else if (signUpData.user) {
        // Individual account
        await supabase
          .from('user_profiles')
          .insert({
            user_id: signUpData.user.id,
            role: 'user'
          })
      }

      alert('Cadastro realizado! Verifique seu email para confirmar a conta.')
    } catch (err) {
      alert('Erro ao cadastrar: ' + String(err))
    }
  }

  const handleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authData.email,
        password: authData.password
      })

      if (error) {
        alert('Erro no login: ' + error.message)
      }
      // Success handled by onAuthStateChange
    } catch (err) {
      alert('Erro ao fazer login: ' + String(err))
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      alert('Erro ao sair: ' + String(err))
    }
  }

  const handleResetPassword = async () => {
    if (!authData.email) {
      alert('Digite seu email primeiro')
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authData.email, {
        redirectTo: window.location.origin + '/reset-password'
      })

      if (error) {
        alert('Erro: ' + error.message)
      } else {
        alert('Email de recuperação enviado! Verifique sua caixa de entrada.')
      }
    } catch (err) {
      alert('Erro ao enviar email: ' + String(err))
    }
  }

  // Data fetching functions
  const fetchClients = async () => {
    if (!user) return
    
    try {
      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      // If user is part of company, get company clients
      if (userCompany && isCompanyAdmin) {
        query = query.eq('company_id', userCompany.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Erro ao buscar prospects:', error)
      } else {
        setClients(data || [])
      }
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const fetchActivities = async () => {
    if (!user) return
    
    try {
      let query = supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })

      if (userCompany && isCompanyAdmin) {
        query = query.eq('company_id', userCompany.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Erro ao buscar atividades:', error)
      } else {
        setActivities(data || [])
      }
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const fetchTeamMembers = async () => {
    if (!userCompany || !isCompanyAdmin) return

    try {
      const { data, error } = await supabase
        .from('team_performance_view')
        .select('*')
        .eq('company_id', userCompany.id)
        .order('ranking_score', { ascending: false })

      if (error) {
        console.error('Erro ao buscar equipe:', error)
      } else {
        setTeamMembers(data || [])
      }
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  useEffect(() => {
    if (currentPage === 'dashboard' && user) {
      fetchClients()
      fetchActivities()
      fetchTeamMembers()
    }
  }, [currentPage, user, userCompany, isCompanyAdmin])

  // CRUD functions
  const handleClientSubmit = async () => {
    if (!user) return
    
    console.log('DEBUG - user completo:', user)
    console.log('DEBUG - user.id:', user?.id)
    console.log('DEBUG - userCompany:', userCompany)
    
    try {
      const insertData = {
        user_id: user.id,
        company_id: userCompany?.id || null,
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        company: clientData.company,
        aum_value: clientData.aum_value ? parseFloat(clientData.aum_value) : null,
        risk_profile: clientData.risk_profile,
        priority: clientData.priority,
        pipeline_stage: clientData.pipeline_stage
      }

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(insertData)
          .eq('id', editingClient.id)
          .eq('user_id', user.id)
        
        if (error) {
          alert('Erro ao atualizar prospect: ' + error.message)
        } else {
          alert('Prospect atualizado com sucesso!')
          setShowClientForm(false)
          setEditingClient(null)
          resetClientForm()
          fetchClients()
        }
      } else {
        console.log('DEBUG - Dados que serão inseridos:', insertData)
        
        const { error } = await supabase
          .from('clients')
          .insert(insertData)
        
        if (error) {
          console.error('DEBUG - Erro no insert:', error)
          alert('Erro ao cadastrar prospect: ' + error.message)
        } else {
          console.log('DEBUG - Prospect inserido com sucesso!')
          alert('Prospect cadastrado com sucesso!')
          setShowClientForm(false)
          resetClientForm()
          fetchClients()
        }
      }
    } catch (err) {
      console.log('DEBUG - Erro catch:', err)
      alert('Erro ao salvar prospect: ' + String(err))
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
      risk_profile: client.risk_profile || '',
      priority: client.priority,
      pipeline_stage: client.pipeline_stage
    })
    setShowClientForm(true)
  }

  const handleDeleteClient = async (client: Client) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)
        .eq('user_id', user.id)
      
      if (error) {
        alert('Erro ao deletar prospect: ' + error.message)
      } else {
        alert('Prospect deletado com sucesso!')
        fetchClients()
        setShowDeleteConfirm(false)
        setDeletingClient(null)
      }
    } catch (err) {
      alert('Erro ao deletar: ' + String(err))
    }
  }

  const handleActivitySubmit = async () => {
    if (!selectedClientForActivity || !user) return
    
    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          company_id: userCompany?.id || null,
          client_id: selectedClientForActivity.id,
          type: activityData.type,
          title: activityData.title,
          description: activityData.description,
          scheduled_date: activityData.scheduled_date || null,
          completed: false
        })
      
      if (error) {
        alert('Erro ao criar atividade: ' + error.message)
      } else {
        alert('Atividade criada com sucesso!')
        setShowActivityForm(false)
        resetActivityForm()
        fetchActivities()
      }
    } catch (err) {
      alert('Erro ao criar atividade: ' + String(err))
    }
  }

  const markActivityCompleted = async (activityId: string) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          completed: true,
          completed_date: new Date().toISOString()
        })
        .eq('id', activityId)
        .eq('user_id', user.id)
      
      if (error) {
        alert('Erro ao marcar atividade: ' + error.message)
      } else {
        fetchActivities()
      }
    } catch (err) {
      alert('Erro ao marcar atividade: ' + String(err))
    }
  }

  const moveClientInPipeline = async (clientId: string, newStage: string) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ pipeline_stage: newStage })
        .eq('id', clientId)
        .eq('user_id', user.id)
      
      if (error) {
        alert('Erro ao mover prospect: ' + error.message)
      } else {
        fetchClients()
      }
    } catch (err) {
      alert('Erro ao mover prospect: ' + String(err))
    }
  }

  const handleOpportunitySubmit = async () => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('opportunities')
        .insert({
          user_id: user.id,
          company_id: userCompany?.id || null,
          funnel_type: currentFunnel,
          name: opportunityData.name,
          email: opportunityData.email,
          phone: opportunityData.phone,
          company: opportunityData.company,
          value: opportunityData.value ? parseFloat(opportunityData.value) : null,
          description: opportunityData.description,
          stage: opportunityData.stage
        })
      
      if (error) {
        alert('Erro ao criar oportunidade: ' + error.message)
      } else {
        alert('Oportunidade criada com sucesso!')
        setShowOpportunityForm(false)
        resetOpportunityForm()
        setCurrentFunnel('')
      }
    } catch (err) {
      alert('Erro ao criar oportunidade: ' + String(err))
    }
  }

  const handleCompanySettingsSubmit = async () => {
    if (!userCompany || !isCompanyAdmin) return

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companySettings.name,
          logo_url: companySettings.logo_url,
          primary_color: companySettings.primary_color,
          secondary_color: companySettings.secondary_color,
          custom_domain: companySettings.custom_domain
        })
        .eq('id', userCompany.id)

      if (error) {
        alert('Erro ao atualizar configurações: ' + error.message)
      } else {
        alert('Configurações atualizadas com sucesso!')
        setShowCompanySettings(false)
        await loadUserCompany(user!)
      }
    } catch (err) {
      alert('Erro ao salvar configurações: ' + String(err))
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
      risk_profile: '',
      priority: 'Média prioridade',
      pipeline_stage: 'Qualificação'
    })
  }

  const resetActivityForm = () => {
    setActivityData({
      type: '',
      title: '',
      description: '',
      scheduled_date: ''
    })
  }

  const resetOpportunityForm = () => {
    setOpportunityData({
      name: '',
      email: '',
      phone: '',
      company: '',
      value: '',
      description: '',
      stage: 'Qualificação'
    })
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.company || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getClientsByStage = (stage: string) => {
    return clients.filter(client => client.pipeline_stage === stage)
  }

  const getTotalAUMByStage = (stage: string) => {
    return clients
      .filter(client => client.pipeline_stage === stage)
      .reduce((total, client) => total + (client.aum_value || 0), 0)
  }

  const getClientActivities = (clientId: string) => {
    return activities.filter(activity => activity.client_id === clientId)
  }

  const pendingActivities = activities.filter(activity => !activity.completed)

  // Funções do Super Ranking
  const getRankingPeriodDays = (period: string) => {
    switch(period) {
      case 'mensal': return 30
      case 'trimestral': return 90
      case 'anual': return 365
      default: return 30
    }
  }

  const getMetricsForPeriod = (period: string) => {
    const days = getRankingPeriodDays(period)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const periodClients = clients.filter(client => 
      new Date(client.created_at || '') >= cutoffDate
    )
    
    const periodActivities = activities.filter(activity => 
      new Date(activity.created_at || '') >= cutoffDate
    )

    const conversions = periodClients.filter(client => 
      client.pipeline_stage === 'Ativação'
    )

    const totalAUM = periodClients.reduce((sum, client) => 
      sum + (client.aum_value || 0), 0
    )

    return {
      newProspects: periodClients.length,
      conversions: conversions.length,
      conversionRate: periodClients.length > 0 ? Math.round((conversions.length / periodClients.length) * 100) : 0,
      totalAUM: totalAUM,
      activitiesCompleted: periodActivities.filter(a => a.completed).length,
      totalActivities: periodActivities.length,
      score: calculateRankingScore(periodClients.length, conversions.length, totalAUM, periodActivities.filter(a => a.completed).length)
    }
  }

  const calculateRankingScore = (prospects: number, conversions: number, aum: number, activities: number) => {
    return (prospects * 10) + (conversions * 50) + (aum / 1000) + (activities * 5)
  }

  // Get company branding
  const getBrandColors = () => {
    if (userCompany?.white_label) {
      return {
        primary: userCompany.primary_color || '#fbbf24',
        secondary: userCompany.secondary_color || '#f59e0b'
      }
    }
    return { primary: '#fbbf24', secondary: '#f59e0b' }
  }

  const getBrandName = () => {
    if (userCompany?.white_label && userCompany.name) {
      return userCompany.name
    }
    return 'CRM do Assessor'
  }

  // Plans with new pricing structure
  const plans: Plan[] = [
    {
      name: "Individual",
      price: "R$ 47",
      features: ["Até 100 prospects", "Pipeline pessoal", "Relatórios básicos", "Suporte por email"],
      type: "individual"
    },
    {
      name: "Escritório",
      price: "R$ 197",
      features: ["Até 10 assessores", "Dashboard consolidado", "Ranking da equipe", "Gestão de assessores", "Suporte prioritário"],
      highlight: true,
      type: "company"
    },
    {
      name: "White Label",
      price: "R$ 497",
      features: ["Assessores ilimitados", "Marca personalizada", "Domínio próprio", "Cores customizadas", "Suporte 24/7", "API completa"],
      type: "whitelabel"
    }
  ]

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gradient-bg text-white min-h-screen">
      <style jsx global>{`
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #1f2937 0%, #000000 50%, #374151 100%); }
        .gold-gradient { background: linear-gradient(135deg, ${getBrandColors().primary}, ${getBrandColors().secondary}); }
        .gold-text { background: linear-gradient(135deg, ${getBrandColors().primary}, ${getBrandColors().secondary}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hover-glow:hover { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
        .hidden { display: none; }
      `}</style>

      {currentPage === 'landing' && (
        <div>
          <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-3">
                  <div className="gold-gradient p-2 rounded-lg">
                    <span className="text-black font-bold">📈</span>
                  </div>
                  <span className="text-xl font-bold gold-text">{getBrandName()}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <button onClick={() => setCurrentPage('login')} className="text-gray-300 hover:text-yellow-400 transition">Entrar</button>
                  <button onClick={() => setCurrentPage('signup')} className="gold-gradient text-black px-6 py-2 rounded-lg hover-glow transition-all duration-300 font-semibold">Começar Agora</button>
                </div>
              </div>
            </div>
          </header>

          <section className="relative py-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                  O CRM que 
                  <span className="gold-text"> multiplica</span> seus resultados
                </h1>
                <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                  Gerencie clientes, pipeline de prospecção e atividades em uma plataforma completa. 
                  Turbine sua produtividade e feche mais negócios.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button onClick={() => setCurrentPage('signup')} className="gold-gradient text-black px-8 py-4 rounded-lg text-lg font-semibold hover-glow transition-all duration-300">
                    Começar Agora
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                  <div className="text-3xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold mb-2">Pipeline Visual</h3>
                  <p className="text-gray-400">Acompanhe suas oportunidades em um funil visual intuitivo</p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                  <div className="text-3xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold mb-2">Gestão de Equipe</h3>
                  <p className="text-gray-400">Dashboards para escritórios com ranking e gestão de assessores</p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                  <div className="text-3xl mb-4">🎨</div>
                  <h3 className="text-xl font-semibold mb-2">White Label</h3>
                  <p className="text-gray-400">Personalize com sua marca, cores e domínio próprio</p>
                </div>
              </div>

              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-8">Mais de <span className="gold-text">1.500+ assessores e consultores</span> já confiam em nossa plataforma</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold gold-text">98%</div>
                    <div className="text-gray-400">Taxa de satisfação</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold gold-text">45%</div>
                    <div className="text-gray-400">Aumento em vendas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold gold-text">60%</div>
                    <div className="text-gray-400">Economia de tempo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold gold-text">24/7</div>
                    <div className="text-gray-400">Suporte dedicado</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border border-yellow-400/30 rounded-2xl p-8 mb-16">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">🔥 Planos Completos</h2>
                  <p className="text-xl mb-6">Desde assessores individuais até escritórios completos</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan, index) => (
                      <div key={index} className={`bg-gray-900 p-6 rounded-xl border-2 ${plan.highlight ? 'border-yellow-400' : 'border-gray-800'}`}>
                        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                        <div className="text-3xl font-bold gold-text mb-4">{plan.price}<span className="text-sm text-gray-400">/mês</span></div>
                        {plan.type === 'company' && (
                          <div className="text-sm text-gray-400 mb-2">+ R$ 27/assessor</div>
                        )}
                        {plan.type === 'whitelabel' && (
                          <div className="text-sm text-gray-400 mb-2">+ R$ 37/assessor</div>
                        )}
                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center text-sm">
                              <span className="text-green-400 mr-2">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button 
                          onClick={() => {
                            setSelectedPlan(plan)
                            setAuthData({...authData, accountType: plan.type || 'individual'})
                            setCurrentPage('signup')
                          }} 
                          className={`w-full py-2 rounded-lg font-semibold transition ${plan.highlight ? 'gold-gradient text-black' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                        >
                          {plan.highlight ? 'Mais Popular' : 'Escolher Plano'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {currentPage === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Entrar na Conta</h1>
              <p className="text-gray-400">Acesse seu {getBrandName()}</p>
            </div>
            <div className="space-y-4">
              <input 
                type="email" 
                value={authData.email}
                onChange={(e) => setAuthData({...authData, email: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Email" 
              />
              <input 
                type="password" 
                value={authData.password}
                onChange={(e) => setAuthData({...authData, password: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Senha" 
              />
              <button onClick={handleSignIn} className="w-full gold-gradient text-black py-3 rounded-lg font-semibold hover-glow transition-all duration-300">
                Entrar
              </button>
              <button 
                onClick={handleResetPassword}
                className="w-full text-yellow-400 text-sm hover:text-yellow-300 transition"
              >
                Esqueci minha senha
              </button>
            </div>
            <div className="text-center mt-6">
              <p className="text-gray-400 text-sm">
                Não tem conta? 
                <button onClick={() => setCurrentPage('signup')} className="text-yellow-400 hover:text-yellow-300 ml-1">
                  Cadastre-se
                </button>
              </p>
            </div>
            <button onClick={() => setCurrentPage('landing')} className="text-gray-400 hover:text-gray-300 mt-4 text-center w-full">
              ← Voltar
            </button>
          </div>
        </div>
      )}

      {currentPage === 'signup' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Criar Conta</h1>
              {selectedPlan && (
                <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
                  <p className="text-yellow-400 text-sm">Plano selecionado: <strong>{selectedPlan.name}</strong></p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Conta</label>
                <select 
                  value={authData.accountType}
                  onChange={(e) => setAuthData({...authData, accountType: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="individual">Assessor Individual</option>
                  <option value="company">Escritório de Investimentos</option>
                  <option value="whitelabel">White Label</option>
                </select>
              </div>
              
              <input 
                type="text" 
                value={authData.name}
                onChange={(e) => setAuthData({...authData, name: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Nome completo" 
              />
              
              {authData.accountType !== 'individual' && (
                <input 
                  type="text" 
                  value={authData.companyName}
                  onChange={(e) => setAuthData({...authData, companyName: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                  placeholder="Nome da empresa" 
                />
              )}
              
              <input 
                type="email" 
                value={authData.email}
                onChange={(e) => setAuthData({...authData, email: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Email profissional" 
              />
              
              <input 
                type="password" 
                value={authData.password}
                onChange={(e) => setAuthData({...authData, password: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Senha (mín. 6 caracteres)" 
              />
              <button onClick={handleSignUp} className="w-full gold-gradient text-black py-3 rounded-lg font-semibold hover-glow transition-all duration-300">
                Criar Conta
              </button>
            </div>
            <div className="text-center mt-6">
              <p className="text-gray-400 text-sm">
                Já tem conta? 
                <button onClick={() => setCurrentPage('login')} className="text-yellow-400 hover:text-yellow-300 ml-1">
                  Entrar
                </button>
              </p>
            </div>
            <button onClick={() => setCurrentPage('landing')} className="text-gray-400 hover:text-gray-300 mt-4 text-center w-full">
              ← Voltar
            </button>
          </div>
        </div>
      )}

      {currentPage === 'dashboard' && user && (
        <div className="min-h-screen bg-black">
          <header className="bg-gray-900 shadow-lg border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  {userCompany?.logo_url ? (
                    <img src={userCompany.logo_url} alt="Logo" className="h-8 w-8 rounded" />
                  ) : (
                    <span className="text-2xl">📈</span>
                  )}
                  <h1 className="text-xl font-bold text-white">{getBrandName()}</h1>
                  <span className="text-sm text-gray-400">
                    - {user.user_metadata?.name || user.email}
                    {userCompany && (
                      <span className="ml-2 px-2 py-1 bg-blue-600 text-xs rounded">
                        {isCompanyAdmin ? 'Admin' : 'Assessor'} - {userCompany.name}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setShowClientForm(true)}
                    className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold hover-glow transition-all duration-300"
                  >
                    + Novo Prospect
                  </button>
                  {isCompanyAdmin && (
                    <button 
                      onClick={() => setShowCompanySettings(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                    >
                      ⚙️ Configurações
                    </button>
                  )}
                  <button onClick={handleSignOut} className="text-gray-400 hover:text-yellow-400 text-sm transition">Sair</button>
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg overflow-x-auto">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'overview' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
              >
                📊 Visão Geral
              </button>
              <button 
                onClick={() => setActiveTab('pipeline')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'pipeline' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
              >
                🏢 Pipeline
              </button>
              <button 
                onClick={() => setActiveTab('clients')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'clients' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
              >
                👥 Prospects
              </button>
              <button 
                onClick={() => setActiveTab('activities')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'activities' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
              >
                📋 Atividades
              </button>
              {isCompanyAdmin && (
                <button 
                  onClick={() => setActiveTab('team')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'team' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
                >
                  👥 Equipe
                </button>
              )}
              <button 
                onClick={() => setActiveTab('consorcio')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'consorcio' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
              >
                🏠 Consórcio
              </button>
              <button 
                onClick={() => setActiveTab('seguros')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'seguros' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
              >
                🛡️ Seguros
              </button>
              <button 
                onClick={() => setActiveTab('cambio')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'cambio' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
              >
                💱 Câmbio
              </button>
              <button 
                onClick={() => setActiveTab('eventos')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'eventos' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
              >
                🎯 Eventos
              </button>
              <button 
                onClick={() => setActiveTab('ranking')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'ranking' ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:text-white'}`}
              >
                🏆 Ranking
              </button>
            </div>

            {activeTab === 'overview' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <p className="text-sm text-gray-400">Total de Prospects</p>
                    <p className="text-2xl font-bold text-white">{clients.length}</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <p className="text-sm text-gray-400">Atividades Pendentes</p>
                    <p className="text-2xl font-bold text-white">{pendingActivities.length}</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <p className="text-sm text-gray-400">AUM Total</p>
                    <p className="text-2xl font-bold text-white">
                      R$ {clients.reduce((total, client) => total + (client.aum_value || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <p className="text-sm text-gray-400">Taxa de Conversão</p>
                    <p className="text-2xl font-bold text-white">
                      {clients.length > 0 ? Math.round((getClientsByStage('Ativação').length / clients.length) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {isCompanyAdmin && userCompany && (
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/30 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">📊 Dashboard da Empresa</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">{teamMembers.length}</div>
                          <div className="text-sm text-gray-400">Assessores Ativos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {teamMembers.reduce((sum, member) => sum + member.total_prospects, 0)}
                          </div>
                          <div className="text-sm text-gray-400">Prospects da Equipe</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">
                            R$ {teamMembers.reduce((sum, member) => sum + member.total_aum, 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-400">AUM Total da Equipe</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Pipeline por Etapa</h3>
                    <div className="space-y-3">
                      {['Qualificação', '1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação'].map(stage => (
                        <div key={stage} className="flex justify-between items-center">
                          <span className="text-gray-300">{stage}</span>
                          <div className="text-right">
                            <span className="text-white font-semibold">{getClientsByStage(stage).length}</span>
                            <span className="text-gray-400 text-sm ml-2">
                              R$ {getTotalAUMByStage(stage).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Atividades Recentes</h3>
                    <div className="space-y-3">
                      {activities.slice(0, 5).map((activity, index) => {
                        const client = clients.find(c => c.id === activity.client_id)
                        return (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <div className="flex-1">
                              <p className="text-white text-sm">{activity.title}</p>
                              <p className="text-gray-400 text-xs">{client?.name}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${activity.completed ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                              {activity.completed ? 'Concluída' : 'Pendente'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && isCompanyAdmin && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Gestão da Equipe</h2>
                  <button className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold">
                    + Convidar Assessor
                  </button>
                </div>

                <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Ranking da Equipe</h3>
                  {teamMembers.length === 0 ? (
                    <p className="text-center text-gray-400">
                      Nenhum assessor na equipe ainda.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {teamMembers.map((member, index) => (
                        <div key={member.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                          <div className="flex items-center space-x-4">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                              index === 0 ? 'bg-yellow-400 text-black' :
                              index === 1 ? 'bg-gray-300 text-black' :
                              index === 2 ? 'bg-orange-400 text-black' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {index < 3 ? (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{member.name}</p>
                              <p className="text-sm text-gray-400">{member.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-400">
                              {Math.round(member.ranking_score)}
                            </div>
                            <div className="text-sm text-gray-400">
                              {member.total_prospects} prospects • {member.total_conversions} conversões
                            </div>
                            <div className="text-sm text-green-400">
                              R$ {member.total_aum.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Outras abas permanecem iguais... */}
            {activeTab === 'pipeline' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Pipeline de Prospecção</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {['Qualificação', '1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação'].map((stage, index) => (
                    <div key={stage} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-white">{stage}</h3>
                        <span className="bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded-full text-xs">
                          {getClientsByStage(stage).length}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
                        R$ {getTotalAUMByStage(stage).toLocaleString()}
                      </div>
                      <div className="space-y-3">
                        {getClientsByStage(stage).map((client) => (
                          <div key={client.id} className="bg-gray-800 p-3 rounded-lg">
                            <p className="text-white font-medium text-sm">{client.name}</p>
                            <p className="text-gray-400 text-xs">{client.company}</p>
                            <p className="text-yellow-400 text-xs">R$ {(client.aum_value || 0).toLocaleString()}</p>
                            <div className="flex space-x-1 mt-2">
                              {index < 4 && (
                                <button 
                                  onClick={() => moveClientInPipeline(client.id, ['1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação'][index])}
                                  className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded hover:bg-yellow-400/30"
                                >
                                  →
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Continue with other tabs... (keeping the same structure but adding company_id where needed) */}
            
            {activeTab === 'clients' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Prospects</h2>
                  <div className="flex space-x-4">
                    <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar prospects..."
                      className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-yellow-400 focus:outline-none"
                    />
                    <button 
                      onClick={() => setShowClientForm(true)}
                      className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold"
                    >
                      + Adicionar Prospect
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg border border-gray-800">
                  <div className="p-6 border-b border-gray-800">
                    <p className="text-gray-400">
                      {filteredClients.length} de {clients.length} prospects
                    </p>
                  </div>
                  <div className="p-6">
                    {filteredClients.length === 0 ? (
                      <p className="text-center text-gray-400">
                        {searchTerm ? 'Nenhum prospect encontrado.' : 'Nenhum prospect cadastrado ainda.'}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {filteredClients.map((client) => (
                          <div key={client.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4">
                                <div>
                                  <p className="font-medium text-white">{client.name}</p>
                                  <p className="text-sm text-gray-400">{client.email}</p>
                                  <p className="text-sm text-gray-400">{client.company}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-yellow-400 font-semibold">R$ {(client.aum_value || 0).toLocaleString()}</p>
                                  <span className="px-2 py-1 rounded-full text-xs bg-blue-400/20 text-blue-400">
                                    {client.pipeline_stage}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => {
                                  setSelectedClientForActivity(client)
                                  setShowActivityForm(true)
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                              >
                                📋 Atividade
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedClientForActivity(client)
                                  setShowClientActivities(true)
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                              >
                                📊 Histórico
                              </button>
                              <button 
                                onClick={() => handleEditClient(client)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                              >
                                ✏️ Editar
                              </button>
                              <button 
                                onClick={() => {
                                  setDeletingClient(client)
                                  setShowDeleteConfirm(true)
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                              >
                                🗑️ Deletar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activities' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Atividades</h2>
                </div>

                <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                  {activities.length === 0 ? (
                    <p className="text-center text-gray-400">
                      Nenhuma atividade criada ainda.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => {
                        const client = clients.find(c => c.id === activity.client_id)
                        return (
                          <div key={activity.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{activity.type === '📞 Ligação' ? '📞' : activity.type === '👥 Reunião' ? '👥' : activity.type === '📧 Email' ? '📧' : '💬'}</span>
                                <div>
                                  <p className="font-medium text-white">{activity.title}</p>
                                  <p className="text-sm text-gray-400">{client?.name}</p>
                                  {activity.description && <p className="text-sm text-gray-500">{activity.description}</p>}
                                  {activity.scheduled_date && (
                                    <p className="text-sm text-yellow-400">
                                      📅 {new Date(activity.scheduled_date).toLocaleString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-3 py-1 rounded-full text-sm ${activity.completed ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                                {activity.completed ? 'Concluída' : 'Pendente'}
                              </span>
                              {!activity.completed && (
                                <button 
                                  onClick={() => markActivityCompleted(activity.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  ✓ Concluir
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'consorcio' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Funil de Consórcio</h2>
                  <button 
                    onClick={() => {
                      setCurrentFunnel('consorcio')
                      setShowOpportunityForm(true)
                    }}
                    className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold"
                  >
                    + Nova Oportunidade
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                  <p className="text-center text-gray-400">
                    Funil de Consórcio em desenvolvimento.
                    <br />
                    Aqui você poderá gerenciar suas oportunidades de consórcio.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'seguros' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Funil de Seguros</h2>
                  <button 
                    onClick={() => {
                      setCurrentFunnel('seguros')
                      setShowOpportunityForm(true)
                    }}
                    className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold"
                  >
                    + Nova Oportunidade
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                  <p className="text-center text-gray-400">
                    Funil de Seguros em desenvolvimento.
                    <br />
                    Aqui você poderá gerenciar suas oportunidades de seguros.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'cambio' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Funil de Câmbio</h2>
                  <button 
                    onClick={() => {
                      setCurrentFunnel('cambio')
                      setShowOpportunityForm(true)
                    }}
                    className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold"
                  >
                    + Nova Oportunidade
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                  <p className="text-center text-gray-400">
                    Funil de Câmbio em desenvolvimento.
                    <br />
                    Aqui você poderá gerenciar suas operações de câmbio.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'eventos' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Gestão de Eventos</h2>
                  <button 
                    onClick={() => {
                      setCurrentFunnel('eventos')
                      setShowOpportunityForm(true)
                    }}
                    className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold"
                  >
                    + Novo Evento
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                  <p className="text-center text-gray-400">
                    Gestão de Eventos em desenvolvimento.
                    <br />
                    Aqui você poderá organizar e acompanhar seus eventos e palestras.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'ranking' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">🏆 Super Ranking</h2>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setRankingPeriod('mensal')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${rankingPeriod === 'mensal' ? 'gold-gradient text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      Mensal
                    </button>
                    <button 
                      onClick={() => setRankingPeriod('trimestral')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${rankingPeriod === 'trimestral' ? 'gold-gradient text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      Trimestral
                    </button>
                    <button 
                      onClick={() => setRankingPeriod('anual')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${rankingPeriod === 'anual' ? 'gold-gradient text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      Anual
                    </button>
                  </div>
                </div>

                {(() => {
                  const currentUserMetrics = getMetricsForPeriod(rankingPeriod)
                  return (
                    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">🏆 Top 3 - Período {rankingPeriod.charAt(0).toUpperCase() + rankingPeriod.slice(1)}</h3>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-yellow-400 mb-2">
                          Você: {Math.round(currentUserMetrics.score)} pontos
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">{currentUserMetrics.newProspects}</div>
                            <div className="text-sm text-gray-400">Prospects</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">{currentUserMetrics.conversions}</div>
                            <div className="text-sm text-gray-400">Conversões</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-400">R$ {currentUserMetrics.totalAUM.toLocaleString()}</div>
                            <div className="text-sm text-gray-400">AUM</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
            
            {/* Modais remain the same with company_id additions... */}
          </div>
        </div>
      )}

      {/* Modal de Cadastro/Edição de Prospect */}
      {showClientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingClient ? 'Editar Prospect' : 'Cadastrar Prospect'}
              </h3>
              <button 
                onClick={() => {
                  setShowClientForm(false)
                  setEditingClient(null)
                  resetClientForm()
                }}
                className="text-gray-400 hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                value={clientData.name}
                onChange={(e) => setClientData({...clientData, name: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Nome do prospect" 
              />
              <input 
                type="email" 
                value={clientData.email}
                onChange={(e) => setClientData({...clientData, email: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Email do prospect" 
              />
              <input 
                type="tel" 
                value={clientData.phone}
                onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Telefone" 
              />
              <input 
                type="text" 
                value={clientData.company}
                onChange={(e) => setClientData({...clientData, company: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Empresa" 
              />
              <input 
                type="number" 
                value={clientData.aum_value}
                onChange={(e) => setClientData({...clientData, aum_value: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Valor AUM (Assets Under Management)" 
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Perfil de Risco</label>
                <select 
                  value={clientData.risk_profile}
                  onChange={(e) => setClientData({...clientData, risk_profile: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="">Selecione o perfil</option>
                  <option value="Conservador">Conservador</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Arrojado">Arrojado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prioridade</label>
                <select 
                  value={clientData.priority}
                  onChange={(e) => setClientData({...clientData, priority: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="Baixa prioridade">Baixa prioridade</option>
                  <option value="Média prioridade">Média prioridade</option>
                  <option value="Alta prioridade">Alta prioridade</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Etapa do Pipeline</label>
                <select 
                  value={clientData.pipeline_stage}
                  onChange={(e) => setClientData({...clientData, pipeline_stage: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="Qualificação">Qualificação</option>
                  <option value="1ª Reunião">1ª Reunião</option>
                  <option value="2ª Reunião">2ª Reunião</option>
                  <option value="Cadastro">Cadastro</option>
                  <option value="Ativação">Ativação</option>
                </select>
              </div>
              <button 
                onClick={handleClientSubmit}
                className="w-full gold-gradient text-black py-3 rounded-lg font-semibold hover-glow transition-all duration-300"
              >
                {editingClient ? 'Atualizar Prospect' : 'Cadastrar Prospect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Atividade */}
      {showActivityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Nova Atividade</h3>
              <button 
                onClick={() => {
                  setShowActivityForm(false)
                  setSelectedClientForActivity(null)
                  resetActivityForm()
                }}
                className="text-gray-400 hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cliente</label>
                <select 
                  value={selectedClientForActivity?.id || ''}
                  onChange={(e) => {
                    const client = clients.find(c => c.id === e.target.value)
                    setSelectedClientForActivity(client || null)
                  }}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Atividade</label>
                <select 
                  value={activityData.type}
                  onChange={(e) => setActivityData({...activityData, type: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="📞 Ligação">📞 Ligação</option>
                  <option value="👥 Reunião">👥 Reunião</option>
                  <option value="📧 Email">📧 Email</option>
                  <option value="💬 WhatsApp">💬 WhatsApp</option>
                </select>
              </div>
              <input 
                type="text" 
                value={activityData.title}
                onChange={(e) => setActivityData({...activityData, title: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Título da atividade" 
              />
              <textarea 
                value={activityData.description}
                onChange={(e) => setActivityData({...activityData, description: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Descrição (opcional)"
                rows={3}
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Data/Hora (opcional)</label>
                <input 
                  type="datetime-local" 
                  value={activityData.scheduled_date}
                  onChange={(e) => setActivityData({...activityData, scheduled_date: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                />
              </div>
              <button 
                onClick={handleActivitySubmit}
                className="w-full gold-gradient text-black py-3 rounded-lg font-semibold hover-glow transition-all duration-300"
              >
                Salvar Atividade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Atividades do Cliente */}
      {showClientActivities && selectedClientForActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Histórico - {selectedClientForActivity.name}
              </h3>
              <button 
                onClick={() => {
                  setShowClientActivities(false)
                  setSelectedClientForActivity(null)
                }}
                className="text-gray-400 hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {getClientActivities(selectedClientForActivity.id).length === 0 ? (
                <p className="text-center text-gray-400">Nenhuma atividade registrada para este cliente.</p>
              ) : (
                getClientActivities(selectedClientForActivity.id).map((activity) => (
                  <div key={activity.id} className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{activity.type === '📞 Ligação' ? '📞' : activity.type === '👥 Reunião' ? '👥' : activity.type === '📧 Email' ? '📧' : '💬'}</span>
                      <div className="flex-1">
                        <p className="font-medium text-white">{activity.title}</p>
                        {activity.description && <p className="text-gray-400 text-sm mt-1">{activity.description}</p>}
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-xs text-gray-500">
                            {activity.scheduled_date && (
                              <span>📅 {new Date(activity.scheduled_date).toLocaleString('pt-BR')}</span>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${activity.completed ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                            {activity.completed ? 'Concluída' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && deletingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="text-red-400 text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-gray-400 mb-6">
                Tem certeza que deseja deletar o prospect <strong>{deletingClient.name}</strong>? 
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex space-x-4">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeletingClient(null)
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteClient(deletingClient)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Oportunidade */}
      {showOpportunityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Nova Oportunidade - {currentFunnel.charAt(0).toUpperCase() + currentFunnel.slice(1)}
              </h3>
              <button 
                onClick={() => {
                  setShowOpportunityForm(false)
                  setCurrentFunnel('')
                  resetOpportunityForm()
                }}
                className="text-gray-400 hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                value={opportunityData.name}
                onChange={(e) => setOpportunityData({...opportunityData, name: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Nome do interessado" 
              />
              <input 
                type="email" 
                value={opportunityData.email}
                onChange={(e) => setOpportunityData({...opportunityData, email: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Email" 
              />
              <input 
                type="tel" 
                value={opportunityData.phone}
                onChange={(e) => setOpportunityData({...opportunityData, phone: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Telefone" 
              />
              <input 
                type="text" 
                value={opportunityData.company}
                onChange={(e) => setOpportunityData({...opportunityData, company: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Empresa (opcional)" 
              />
              <input 
                type="number" 
                value={opportunityData.value}
                onChange={(e) => setOpportunityData({...opportunityData, value: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder={`Valor estimado da ${currentFunnel === 'eventos' ? 'participação' : 'oportunidade'}`} 
              />
              <textarea 
                value={opportunityData.description}
                onChange={(e) => setOpportunityData({...opportunityData, description: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Observações (opcional)"
                rows={3}
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Etapa</label>
                <select 
                  value={opportunityData.stage}
                  onChange={(e) => setOpportunityData({...opportunityData, stage: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="Qualificação">Qualificação</option>
                  <option value="1ª Reunião">1ª Reunião</option>
                  <option value="2ª Reunião">2ª Reunião</option>
                  <option value="Cadastro">Cadastro</option>
                  <option value="Ativação">Ativação</option>
                </select>
              </div>
              <button 
                onClick={handleOpportunitySubmit}
                className="w-full gold-gradient text-black py-3 rounded-lg font-semibold hover-glow transition-all duration-300"
              >
                Criar Oportunidade
              </button>
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
      )}

      {/* Company Settings Modal */}
      {showCompanySettings && isCompanyAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Configurações da Empresa</h3>
              <button 
                onClick={() => setShowCompanySettings(false)}
                className="text-gray-400 hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                value={companySettings.name}
                onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="Nome da empresa" 
              />
              <input 
                type="url" 
                value={companySettings.logo_url}
                onChange={(e) => setCompanySettings({...companySettings, logo_url: e.target.value})}
                className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                placeholder="URL do logo" 
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Cor Primária</label>
                  <input 
                    type="color" 
                    value={companySettings.primary_color}
                    onChange={(e) => setCompanySettings({...companySettings, primary_color: e.target.value})}
                    className="w-full h-12 border border-gray-700 bg-gray-800 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Cor Secundária</label>
                  <input 
                    type="color" 
                    value={companySettings.secondary_color}
                    onChange={(e) => setCompanySettings({...companySettings, secondary_color: e.target.value})}
                    className="w-full h-12 border border-gray-700 bg-gray-800 rounded-lg"
                  />
                </div>
              </div>
              {userCompany?.white_label && (
                <input 
                  type="text" 
                  value={companySettings.custom_domain}
                  onChange={(e) => setCompanySettings({...companySettings, custom_domain: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none"
                  placeholder="Domínio personalizado (ex: crm.suaempresa.com)" 
                />
              )}
              <button 
                onClick={handleCompanySettingsSubmit}
                className="w-full gold-gradient text-black py-3 rounded-lg font-semibold hover-glow transition-all duration-300"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other existing modals... */}
    </div>
  )
}