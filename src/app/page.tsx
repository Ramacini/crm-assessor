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
  created_at: string
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
}

interface Company {
  id: string
  name: string
  manager_id: string
  created_at: string
}

interface UserProfile {
  id: string
  user_id: string
  company_id?: string
  role: string
  name: string
  email: string
  created_at: string
}

interface TeamMember {
  id: string
  user_id: string
  company_id: string
  role: string
  name: string
  email: string
  total_clients: number
  total_aum: number
  conversion_rate: number
}

interface Plan {
  name: string
  price: string
  features: string[]
}

export default function CRM() {
  // Estados principais
  const [user, setUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState('landing')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  // Estados de perfil e empresa
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userCompany, setUserCompany] = useState<Company | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // Estados de dados
  const [clients, setClients] = useState<Client[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])

  // Estados de modais
  const [showClientModal, setShowClientModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showOpportunityModal, setShowOpportunityModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)

  // Estados de formulários
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    aum_value: '',
    priority: 'Média prioridade',
    pipeline_stage: 'Qualificação'
  })

  const [activityData, setActivityData] = useState({
    client_id: '',
    type: 'Ligação',
    title: '',
    description: '',
    scheduled_date: ''
  })

  const [opportunityData, setOpportunityData] = useState({
    funnel_type: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    value: '',
    description: '',
    stage: 'Qualificação'
  })

  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'individual'
  })

  const [companyData, setCompanyData] = useState({
    name: ''
  })

  const [memberData, setMemberData] = useState({
    email: '',
    name: '',
    role: 'assessor'
  })

  // Estados auxiliares
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Verificar autenticação
  useEffect(() => {
    checkAuth()
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        setCurrentPage('dashboard')
        loadUserProfile(session.user.id)
      } else {
        setUser(null)
        setCurrentPage('landing')
        setUserProfile(null)
        setUserCompany(null)
      }
    })
  }, [])

  // Carregar dados quando usuário autenticado
  useEffect(() => {
    if (user && userProfile) {
      fetchClients()
      fetchActivities()
      fetchOpportunities()
      if (userProfile.role === 'manager') {
        fetchTeamMembers()
      }
    }
  }, [user, userProfile])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      setCurrentPage('dashboard')
      await loadUserProfile(session.user.id)
    }
    setLoading(false)
  }

  const loadUserProfile = async (userId: string) => {
    try {
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileError) {
        // Se não tem perfil, criar um básico
        const userEmail = user?.email || ''
        const userName = user?.user_metadata?.name || userEmail.split('@')[0]
        
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            role: 'individual',
            name: userName,
            email: userEmail
          })
          .select()
          .single()

        if (createError) throw createError
        setUserProfile(newProfile)
        return
      }

      setUserProfile(profile)

      // Se tem empresa, buscar dados da empresa
      if (profile.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single()

        if (!companyError && company) {
          setUserCompany(company)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    }
  }

  // Funções de autenticação
  const handleSignUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: {
          data: {
            name: authData.name,
            role: authData.role
          }
        }
      })
      
      if (error) throw error
      
      // Criar perfil do usuário
      if (data.user) {
        await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            role: authData.role,
            name: authData.name,
            email: authData.email
          })
      }
      
      alert('Cadastro realizado! Verifique seu email para confirmar.')
    } catch (error: any) {
      alert('Erro no cadastro: ' + error.message)
    }
  }

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authData.email,
        password: authData.password
      })
      if (error) throw error
    } catch (error: any) {
      alert('Erro no login: ' + error.message)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setActiveTab('dashboard')
  }

  // Funções de empresa
  const handleCreateCompany = async () => {
    if (!user || !userProfile) return
    
    try {
      // Criar empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyData.name,
          manager_id: user.id
        })
        .select()
        .single()

      if (companyError) throw companyError

      // Atualizar perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          company_id: company.id,
          role: 'manager'
        })
        .eq('user_id', user.id)

      if (profileError) throw profileError

      setUserCompany(company)
      setUserProfile({ ...userProfile, company_id: company.id, role: 'manager' })
      setShowCompanyModal(false)
      setCompanyData({ name: '' })
      alert('Empresa criada com sucesso!')
    } catch (error: any) {
      alert('Erro ao criar empresa: ' + error.message)
    }
  }

  const handleAddMember = async () => {
    if (!userCompany || !user) return
    
    try {
      // Criar convite (por enquanto vamos simular criando um usuário diretamente)
      const tempPassword = Math.random().toString(36).slice(-8)
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: memberData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: memberData.name,
          role: memberData.role
        }
      })

      if (authError) throw authError

      // Criar perfil do membro
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authUser.user.id,
          company_id: userCompany.id,
          role: memberData.role,
          name: memberData.name,
          email: memberData.email
        })

      if (profileError) throw profileError

      setShowAddMemberModal(false)
      setMemberData({ email: '', name: '', role: 'assessor' })
      fetchTeamMembers()
      alert(`Membro adicionado! Senha temporária: ${tempPassword}`)
    } catch (error: any) {
      alert('Erro ao adicionar membro: ' + error.message)
    }
  }

  const fetchTeamMembers = async () => {
    if (!userCompany) return
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          clients!inner(count),
          activities!inner(count)
        `)
        .eq('company_id', userCompany.id)
        .neq('role', 'manager')

      if (error) throw error

      // Calcular métricas para cada membro
      const membersWithMetrics = await Promise.all(
        (data || []).map(async (member) => {
          const { data: memberClients } = await supabase
            .from('clients')
            .select('aum_value, pipeline_stage')
            .eq('user_id', member.user_id)

          const totalClients = memberClients?.length || 0
          const totalAUM = memberClients?.reduce((sum, client) => sum + (client.aum_value || 0), 0) || 0
          const conversions = memberClients?.filter(c => c.pipeline_stage === 'Ativação').length || 0
          const conversionRate = totalClients > 0 ? (conversions / totalClients) * 100 : 0

          return {
            id: member.id,
            user_id: member.user_id,
            company_id: member.company_id,
            role: member.role,
            name: member.name,
            email: member.email,
            total_clients: totalClients,
            total_aum: totalAUM,
            conversion_rate: conversionRate
          }
        })
      )

      setTeamMembers(membersWithMetrics)
    } catch (error) {
      console.error('Erro ao buscar membros:', error)
    }
  }

  // Funções de busca de dados
  const fetchClients = async () => {
    if (!user || !userProfile) return
    
    try {
      let query = supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)

      // Se for gestor, buscar todos os clientes da empresa
      if (userProfile.role === 'manager' && userCompany) {
        query = supabase
          .from('clients')
          .select('*')
          .eq('company_id', userCompany.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Erro ao buscar prospects:', error)
    }
  }

  const fetchActivities = async () => {
    if (!user || !userProfile) return
    
    try {
      let query = supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)

      // Se for gestor, buscar todas as atividades da empresa
      if (userProfile.role === 'manager' && userCompany) {
        query = supabase
          .from('activities')
          .select('*')
          .eq('company_id', userCompany.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Erro ao buscar atividades:', error)
    }
  }

  const fetchOpportunities = async () => {
    if (!user || !userProfile) return
    
    try {
      let query = supabase
        .from('opportunities')
        .select('*')
        .eq('user_id', user.id)

      // Se for gestor, buscar todas as oportunidades da empresa
      if (userProfile.role === 'manager' && userCompany) {
        query = supabase
          .from('opportunities')
          .select('*')
          .eq('company_id', userCompany.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setOpportunities(data || [])
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error)
    }
  }

  // Funções CRUD de clientes
  const handleClientSubmit = async () => {
    if (!user || !userProfile) return
    
    try {
      const clientPayload = {
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        company: clientData.company,
        aum_value: clientData.aum_value ? parseFloat(clientData.aum_value) : null,
        priority: clientData.priority,
        pipeline_stage: clientData.pipeline_stage,
        user_id: user.id,
        company_id: userProfile.company_id || null
      }

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientPayload)
          .eq('id', editingClient.id)
          .eq('user_id', user.id)
        
        if (error) throw error
        alert('Prospect atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientPayload)
        
        if (error) throw error
        alert('Prospect cadastrado com sucesso!')
      }
      
      setShowClientModal(false)
      resetClientForm()
      fetchClients()
    } catch (error: any) {
      alert('Erro ao salvar prospect: ' + error.message)
    }
  }

  const handleDeleteClient = async () => {
    if (!clientToDelete || !user) return
    
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      alert('Prospect excluído com sucesso!')
      setShowDeleteModal(false)
      setClientToDelete(null)
      fetchClients()
    } catch (error: any) {
      alert('Erro ao excluir prospect: ' + error.message)
    }
  }

  const resetClientForm = () => {
    setClientData({
      name: '',
      email: '',
      phone: '',
      company: '',
      aum_value: '',
      priority: 'Média prioridade',
      pipeline_stage: 'Qualificação'
    })
    setEditingClient(null)
  }

  // Funções de atividades
  const handleActivitySubmit = async () => {
    if (!user || !userProfile) return
    
    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          company_id: userProfile.company_id || null,
          client_id: activityData.client_id,
          type: activityData.type,
          title: activityData.title,
          description: activityData.description,
          scheduled_date: activityData.scheduled_date || null,
          completed: false
        })
      
      if (error) throw error
      alert('Atividade criada com sucesso!')
      setShowActivityModal(false)
      resetActivityForm()
      fetchActivities()
    } catch (error: any) {
      alert('Erro ao criar atividade: ' + error.message)
    }
  }

  const resetActivityForm = () => {
    setActivityData({
      client_id: '',
      type: 'Ligação',
      title: '',
      description: '',
      scheduled_date: ''
    })
  }

  // Funções de oportunidades
  const handleOpportunitySubmit = async () => {
    if (!user || !userProfile) return
    
    try {
      const { error } = await supabase
        .from('opportunities')
        .insert({
          user_id: user.id,
          company_id: userProfile.company_id || null,
          funnel_type: opportunityData.funnel_type,
          name: opportunityData.name,
          email: opportunityData.email,
          phone: opportunityData.phone,
          company: opportunityData.company,
          value: opportunityData.value ? parseFloat(opportunityData.value) : null,
          description: opportunityData.description,
          stage: opportunityData.stage
        })
      
      if (error) throw error
      alert('Oportunidade criada com sucesso!')
      setShowOpportunityModal(false)
      resetOpportunityForm()
      fetchOpportunities()
    } catch (error: any) {
      alert('Erro ao criar oportunidade: ' + error.message)
    }
  }

  const resetOpportunityForm = () => {
    setOpportunityData({
      funnel_type: '',
      name: '',
      email: '',
      phone: '',
      company: '',
      value: '',
      description: '',
      stage: 'Qualificação'
    })
  }

  // Funções auxiliares
  const getOpportunitiesByType = (type: string) => {
    return opportunities.filter(opp => opp.funnel_type === type)
  }

  const getOpportunitiesByStage = (type: string, stage: string) => {
    return opportunities.filter(opp => opp.funnel_type === type && opp.stage === stage)
  }

  const moveOpportunity = async (opportunityId: string, newStage: string) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ stage: newStage })
        .eq('id', opportunityId)
        .eq('user_id', user.id)
      
      if (error) throw error
      fetchOpportunities()
    } catch (error: any) {
      alert('Erro ao mover oportunidade: ' + error.message)
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Cálculos de KPIs
  const totalProspects = clients.length
  const totalAUM = clients.reduce((sum, client) => sum + (client.aum_value || 0), 0)
  const conversionRate = totalProspects > 0 ? ((clients.filter(c => c.pipeline_stage === 'Ativação').length / totalProspects) * 100).toFixed(1) : '0'
  const pendingActivities = activities.filter(activity => !activity.completed).length

  // Planos de preços
  const plans: Plan[] = [
    {
      name: "Individual",
      price: "R$ 47",
      features: ["Assessor independente", "Gestão básica de prospects", "Pipeline pessoal", "Suporte por email"]
    },
    {
      name: "Equipe", 
      price: "R$ 197",
      features: ["Gestão de equipe", "Dashboard consolidado", "Ranking interno", "Múltiplos assessores", "Suporte prioritário"]
    },
    {
      name: "Enterprise",
      price: "R$ 497",
      features: ["White label", "Múltiplas equipes", "API personalizada", "Suporte 24/7", "Consultoria especializada"]
    }
  ]

  const stages = ['Qualificação', '1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação']

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-2xl text-yellow-400 animate-pulse">Carregando...</div>
      </div>
    )
  }

  // Landing Page
  if (currentPage === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* Header */}
        <header className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-yellow-400">CRM do Assessor</div>
          <div className="space-x-4">
            <button 
              onClick={() => setCurrentPage('login')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-semibold transition duration-300"
            >
              Entrar
            </button>
            <button 
              onClick={() => setCurrentPage('signup')}
              className="border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black px-6 py-2 rounded-lg font-semibold transition duration-300"
            >
              Cadastrar
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            CRM do Assessor
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            A plataforma definitiva para assessores e consultores de investimentos gerenciarem seus prospects e maximizarem resultados
          </p>
          <div className="space-x-4">
            <button 
              onClick={() => setCurrentPage('signup')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-lg text-lg font-semibold transition duration-300 shadow-lg"
            >
              Começar Agora
            </button>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-yellow-400 mb-4">Mais de 1.500+ assessores e consultores já confiam em nossa plataforma</h2>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-6 py-16">
          <h2 className="text-4xl font-bold text-center mb-16 text-yellow-400">Funcionalidades Principais</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-8 rounded-xl border border-yellow-500/20 shadow-xl">
              <h3 className="text-xl font-semibold text-yellow-400 mb-4">🎯 Gestão de Prospects</h3>
              <p className="text-gray-300">Sistema completo para gerenciar prospects com campos personalizados e acompanhamento detalhado</p>
            </div>
            <div className="bg-gray-800 p-8 rounded-xl border border-yellow-500/20 shadow-xl">
              <h3 className="text-xl font-semibold text-yellow-400 mb-4">🏢 Gestão de Equipes</h3>
              <p className="text-gray-300">Gerencie equipes completas de assessores com dashboard consolidado e ranking interno</p>
            </div>
            <div className="bg-gray-800 p-8 rounded-xl border border-yellow-500/20 shadow-xl">
              <h3 className="text-xl font-semibold text-yellow-400 mb-4">📊 Pipeline de Prospecção</h3>
              <p className="text-gray-300">Funil de prospecção interativo com drag & drop para acompanhar o progresso de cada prospect</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="container mx-auto px-6 py-16">
          <h2 className="text-4xl font-bold text-center mb-16 text-yellow-400">Planos e Preços</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div key={index} className="bg-gray-800 p-8 rounded-xl border border-yellow-500/20 shadow-xl relative">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">{plan.name}</h3>
                <div className="text-4xl font-bold text-white mb-6">{plan.price}<span className="text-lg text-gray-400">/mês</span></div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center text-gray-300">
                      <span className="text-yellow-400 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => setCurrentPage('signup')}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded-lg font-semibold transition duration-300"
                >
                  Escolher Plano
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-8">
          <div className="container mx-auto px-6 text-center text-gray-400">
            <p>&copy; 2024 CRM do Assessor. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    )
  }

  // Login Page
  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-yellow-500/20">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Entrar</h2>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={authData.email}
              onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
            />
            <input
              type="password"
              placeholder="Senha"
              value={authData.password}
              onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
            />
            <button
              onClick={handleSignIn}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded-lg font-semibold transition duration-300"
            >
              Entrar
            </button>
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentPage('signup')}
              className="text-yellow-400 hover:text-yellow-300 transition duration-300"
            >
              Não tem conta? Cadastre-se
            </button>
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={() => setCurrentPage('landing')}
              className="text-gray-400 hover:text-white transition duration-300"
            >
              ← Voltar ao início
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Signup Page
  if (currentPage === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-yellow-500/20">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Cadastrar</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nome completo"
              value={authData.name}
              onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={authData.email}
              onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
            />
            <input
              type="password"
              placeholder="Senha"
              value={authData.password}
              onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
            />
            <select
              value={authData.role}
              onChange={(e) => setAuthData({ ...authData, role: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
            >
              <option value="individual">Assessor Individual</option>
              <option value="manager">Gestor de Equipe</option>
            </select>
            <button
              onClick={handleSignUp}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded-lg font-semibold transition duration-300"
            >
              Cadastrar
            </button>
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentPage('login')}
              className="text-yellow-400 hover:text-yellow-300 transition duration-300"
            >
              Já tem conta? Entre aqui
            </button>
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={() => setCurrentPage('landing')}
              className="text-gray-400 hover:text-white transition duration-300"
            >
              ← Voltar ao início
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard Principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-xl border-b border-yellow-500/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-yellow-400">CRM do Assessor</h1>
            {userCompany && (
              <span className="text-gray-300">- {userCompany.name}</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {userProfile?.role === 'manager' && !userCompany && (
              <button
                onClick={() => setShowCompanyModal(true)}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition duration-300"
              >
                Criar Equipe
              </button>
            )}
            <span className="text-gray-300">
              {userProfile?.role === 'manager' ? '👨‍💼 Gestor' : '👤 Assessor'} - {userProfile?.name}
            </span>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition duration-300"
            >
              Sair
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="container mx-auto px-6">
          <div className="flex space-x-1">
            {[
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'clients', label: '👥 Prospects' },
              { id: 'activities', label: '📋 Atividades' },
              ...(userProfile?.role === 'manager' ? [{ id: 'team', label: '🏢 Minha Equipe' }] : []),
              { id: 'consorcio', label: '🏠 Consórcio' },
              { id: 'seguros', label: '🛡️ Seguros' },
              { id: 'cambio', label: '💱 Câmbio' },
              { id: 'eventos', label: '🎯 Eventos' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium transition duration-300 ${
                  activeTab === tab.id
                    ? 'bg-yellow-500 text-black rounded-t-lg'
                    : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-700/50 rounded-t-lg'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-3xl font-bold text-yellow-400 mb-8">
              Dashboard {userProfile?.role === 'manager' ? '- Visão da Equipe' : ''}
            </h2>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-xl border border-yellow-500/20 shadow-lg">
                <h3 className="text-yellow-400 text-sm font-medium">
                  {userProfile?.role === 'manager' ? 'Prospects da Equipe' : 'Total de Prospects'}
                </h3>
                <p className="text-3xl font-bold text-white">{totalProspects}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-yellow-500/20 shadow-lg">
                <h3 className="text-yellow-400 text-sm font-medium">
                  {userProfile?.role === 'manager' ? 'AUM da Equipe' : 'AUM Total'}
                </h3>
                <p className="text-3xl font-bold text-white">R$ {totalAUM.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-yellow-500/20 shadow-lg">
                <h3 className="text-yellow-400 text-sm font-medium">Taxa de Conversão</h3>
                <p className="text-3xl font-bold text-white">{conversionRate}%</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-yellow-500/20 shadow-lg">
                <h3 className="text-yellow-400 text-sm font-medium">
                  {userProfile?.role === 'manager' ? 'Assessores' : 'Atividades Pendentes'}
                </h3>
                <p className="text-3xl font-bold text-white">
                  {userProfile?.role === 'manager' ? teamMembers.length : pendingActivities}
                </p>
              </div>
            </div>

            {/* Pipeline por Etapa */}
            <div className="bg-gray-800 p-6 rounded-xl border border-yellow-500/20 shadow-lg mb-8">
              <h3 className="text-xl font-semibold text-yellow-400 mb-6">Pipeline por Etapa</h3>
              <div className="grid grid-cols-5 gap-4">
                {stages.map((stage) => {
                  const stageClients = clients.filter(c => c.pipeline_stage === stage)
                  return (
                    <div key={stage} className="text-center">
                      <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                        <h4 className="font-semibold text-white mb-2">{stage}</h4>
                        <div className="text-2xl font-bold text-yellow-400">{stageClients.length}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Ranking da Equipe (se for gestor) */}
            {userProfile?.role === 'manager' && teamMembers.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-xl border border-yellow-500/20 shadow-lg">
                <h3 className="text-xl font-semibold text-yellow-400 mb-6">Ranking da Equipe</h3>
                <div className="space-y-4">
                  {teamMembers
                    .sort((a, b) => b.total_aum - a.total_aum)
                    .map((member, index) => (
                      <div key={member.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{member.name}</h4>
                            <p className="text-gray-400">{member.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-bold">R$ {member.total_aum.toLocaleString()}</div>
                          <div className="text-gray-400 text-sm">
                            {member.total_clients} prospects • {member.conversion_rate.toFixed(1)}% conversão
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Minha Equipe (só para gestores) */}
        {activeTab === 'team' && userProfile?.role === 'manager' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-yellow-400">Minha Equipe - {userCompany?.name}</h2>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold transition duration-300 shadow-lg"
              >
                + Adicionar Assessor
              </button>
            </div>

            {teamMembers.length === 0 ? (
              <div className="bg-gray-800 p-8 rounded-xl border border-yellow-500/20 shadow-lg text-center">
                <p className="text-gray-400 mb-4">Sua equipe ainda não tem assessores.</p>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold transition duration-300"
                >
                  Adicionar Primeiro Assessor
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl border border-yellow-500/20 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Assessor</th>
                        <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Email</th>
                        <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Prospects</th>
                        <th className="px-6 py-4 text-left text-yellow-400 font-semibold">AUM Total</th>
                        <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Conversão</th>
                        <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Posição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers
                        .sort((a, b) => b.total_aum - a.total_aum)
                        .map((member, index) => (
                          <tr key={member.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                            <td className="px-6 py-4 text-white font-medium">{member.name}</td>
                            <td className="px-6 py-4 text-gray-300">{member.email}</td>
                            <td className="px-6 py-4 text-gray-300">{member.total_clients}</td>
                            <td className="px-6 py-4 text-yellow-400 font-semibold">
                              R$ {member.total_aum.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-gray-300">{member.conversion_rate.toFixed(1)}%</td>
                            <td className="px-6 py-4">
                              <span className="text-2xl">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                              </span>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prospects */}
        {activeTab === 'clients' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-yellow-400">
                Prospects {userProfile?.role === 'manager' ? '- Visão da Equipe' : ''}
              </h2>
              <button
                onClick={() => setShowClientModal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold transition duration-300 shadow-lg"
              >
                + Adicionar Prospect
              </button>
            </div>

            {/* Busca */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Buscar prospects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            {/* Lista de Prospects */}
            <div className="bg-gray-800 rounded-xl border border-yellow-500/20 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Nome</th>
                      <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Email</th>
                      <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Prioridade</th>
                      <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Etapa</th>
                      <th className="px-6 py-4 text-left text-yellow-400 font-semibold">AUM</th>
                      {userProfile?.role !== 'manager' && (
                        <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Ações</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                          Nenhum prospect encontrado. Adicione seu primeiro prospect!
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <tr key={client.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-white font-medium">{client.name}</td>
                          <td className="px-6 py-4 text-gray-300">{client.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              client.priority === 'Alta prioridade' ? 'bg-red-500/20 text-red-400' :
                              client.priority === 'Média prioridade' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {client.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-300">{client.pipeline_stage}</td>
                          <td className="px-6 py-4 text-gray-300">
                            {client.aum_value ? `R$ ${client.aum_value.toLocaleString()}` : '-'}
                          </td>
                          {userProfile?.role !== 'manager' && (
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingClient(client)
                                    setClientData({
                                      name: client.name,
                                      email: client.email,
                                      phone: client.phone || '',
                                      company: client.company || '',
                                      aum_value: client.aum_value?.toString() || '',
                                      priority: client.priority,
                                      pipeline_stage: client.pipeline_stage
                                    })
                                    setShowClientModal(true)
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition duration-300"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => {
                                    setClientToDelete(client)
                                    setShowDeleteModal(true)
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition duration-300"
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Atividades */}
        {activeTab === 'activities' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-yellow-400">
                Atividades {userProfile?.role === 'manager' ? '- Visão da Equipe' : ''}
              </h2>
              {userProfile?.role !== 'manager' && (
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold transition duration-300 shadow-lg"
                >
                  + Nova Atividade
                </button>
              )}
            </div>

            <div className="bg-gray-800 rounded-xl border border-yellow-500/20 shadow-lg p-6">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Nenhuma atividade encontrada. Crie sua primeira atividade!
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-white">{activity.title}</h3>
                          <p className="text-gray-300">{activity.type}</p>
                          {activity.description && (
                            <p className="text-gray-400 mt-2">{activity.description}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activity.completed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {activity.completed ? 'Concluída' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Funis - Consórcio, Seguros, Câmbio, Eventos */}
        {['consorcio', 'seguros', 'cambio', 'eventos'].includes(activeTab) && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-yellow-400 capitalize">
                {activeTab} {userProfile?.role === 'manager' ? '- Visão da Equipe' : ''}
              </h2>
              {userProfile?.role !== 'manager' && (
                <button
                  onClick={() => {
                    setOpportunityData({ ...opportunityData, funnel_type: activeTab })
                    setShowOpportunityModal(true)
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold transition duration-300 shadow-lg"
                >
                  + Nova Oportunidade
                </button>
              )}
            </div>

            {/* Pipeline Visual */}
            <div className="bg-gray-800 rounded-xl border border-yellow-500/20 shadow-lg p-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-6">Pipeline de {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
              <div className="grid grid-cols-5 gap-4">
                {stages.map((stage) => {
                  const stageOpportunities = getOpportunitiesByStage(activeTab, stage)
                  return (
                    <div key={stage} className="bg-gray-700 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-3 text-center">{stage}</h4>
                      <div className="text-center mb-3">
                        <span className="bg-yellow-500 text-black px-2 py-1 rounded-full text-sm font-bold">
                          {stageOpportunities.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {stageOpportunities.map((opp) => (
                          <div key={opp.id} className="bg-gray-600 p-3 rounded border border-gray-500">
                            <h5 className="font-medium text-white text-sm">{opp.name}</h5>
                            <p className="text-gray-300 text-xs">{opp.email}</p>
                            {opp.value && (
                              <p className="text-yellow-400 text-xs font-semibold">
                                R$ {opp.value.toLocaleString()}
                              </p>
                            )}
                            {userProfile?.role !== 'manager' && (
                              <div className="flex justify-between mt-2">
                                {stage !== 'Qualificação' && (
                                  <button
                                    onClick={() => {
                                      const currentIndex = stages.indexOf(stage)
                                      const previousStage = stages[currentIndex - 1]
                                      moveOpportunity(opp.id, previousStage)
                                    }}
                                    className="text-yellow-400 hover:text-yellow-300 text-xs"
                                  >
                                    ←
                                  </button>
                                )}
                                {stage !== 'Ativação' && (
                                  <button
                                    onClick={() => {
                                      const currentIndex = stages.indexOf(stage)
                                      const nextStage = stages[currentIndex + 1]
                                      moveOpportunity(opp.id, nextStage)
                                    }}
                                    className="text-yellow-400 hover:text-yellow-300 text-xs"
                                  >
                                    →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criar Empresa */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-yellow-500/20 shadow-2xl">
            <h3 className="text-2xl font-bold text-yellow-400 mb-6">Criar Equipe/Escritório</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-300 mb-2">Nome da Empresa/Escritório</label>
                <input
                  type="text"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Ex: Esparta Investimentos"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCompanyModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCompany}
                className="flex-1 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition duration-300 font-semibold"
              >
                Criar Equipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Membro */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-yellow-500/20 shadow-2xl">
            <h3 className="text-2xl font-bold text-yellow-400 mb-6">Adicionar Assessor à Equipe</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-300 mb-2">Nome do Assessor</label>
                <input
                  type="text"
                  value={memberData.name}
                  onChange={(e) => setMemberData({ ...memberData, name: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Nome completo"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={memberData.email}
                  onChange={(e) => setMemberData({ ...memberData, email: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="email@empresa.com"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Cargo</label>
                <select
                  value={memberData.role}
                  onChange={(e) => setMemberData({ ...memberData, role: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="assessor">Assessor</option>
                  <option value="senior_assessor">Assessor Sênior</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMember}
                className="flex-1 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition duration-300 font-semibold"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prospect */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl w-full max-w-2xl border border-yellow-500/20 shadow-2xl">
            <h3 className="text-2xl font-bold text-yellow-400 mb-6">
              {editingClient ? 'Editar Prospect' : 'Adicionar Prospect'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-300 mb-2">Nome do Prospect</label>
                <input
                  type="text"
                  value={clientData.name}
                  onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Nome do prospect"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Email do Prospect</label>
                <input
                  type="email"
                  value={clientData.email}
                  onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Email do prospect"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Telefone</label>
                <input
                  type="text"
                  value={clientData.phone}
                  onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Telefone"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Empresa</label>
                <input
                  type="text"
                  value={clientData.company}
                  onChange={(e) => setClientData({ ...clientData, company: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Empresa"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Valor AUM</label>
                <input
                  type="number"
                  value={clientData.aum_value}
                  onChange={(e) => setClientData({ ...clientData, aum_value: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Valor AUM"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Prioridade</label>
                <select
                  value={clientData.priority}
                  onChange={(e) => setClientData({ ...clientData, priority: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="Baixa prioridade">Baixa prioridade</option>
                  <option value="Média prioridade">Média prioridade</option>
                  <option value="Alta prioridade">Alta prioridade</option>
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-gray-300 mb-2">Etapa do Pipeline</label>
                <select
                  value={clientData.pipeline_stage}
                  onChange={(e) => setClientData({ ...clientData, pipeline_stage: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  {stages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowClientModal(false)
                  resetClientForm()
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleClientSubmit}
                className="flex-1 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition duration-300 font-semibold"
              >
                {editingClient ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Atividade */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl w-full max-w-2xl border border-yellow-500/20 shadow-2xl">
            <h3 className="text-2xl font-bold text-yellow-400 mb-6">Nova Atividade</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-300 mb-2">Prospect</label>
                <select
                  value={activityData.client_id}
                  onChange={(e) => setActivityData({ ...activityData, client_id: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="">Selecione um prospect</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Tipo</label>
                <select
                  value={activityData.type}
                  onChange={(e) => setActivityData({ ...activityData, type: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="Ligação">Ligação</option>
                  <option value="Email">Email</option>
                  <option value="Reunião">Reunião</option>
                  <option value="WhatsApp">WhatsApp</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Título</label>
                <input
                  type="text"
                  value={activityData.title}
                  onChange={(e) => setActivityData({ ...activityData, title: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Título da atividade"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Descrição</label>
                <textarea
                  value={activityData.description}
                  onChange={(e) => setActivityData({ ...activityData, description: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Descrição da atividade"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Data Agendada</label>
                <input
                  type="datetime-local"
                  value={activityData.scheduled_date}
                  onChange={(e) => setActivityData({ ...activityData, scheduled_date: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowActivityModal(false)
                  resetActivityForm()
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleActivitySubmit}
                className="flex-1 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition duration-300 font-semibold"
              >
                Criar Atividade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Oportunidade */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl w-full max-w-2xl border border-yellow-500/20 shadow-2xl">
            <h3 className="text-2xl font-bold text-yellow-400 mb-6">
              Nova Oportunidade - {opportunityData.funnel_type.charAt(0).toUpperCase() + opportunityData.funnel_type.slice(1)}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={opportunityData.name}
                  onChange={(e) => setOpportunityData({ ...opportunityData, name: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Nome do prospect"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={opportunityData.email}
                  onChange={(e) => setOpportunityData({ ...opportunityData, email: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Email"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Telefone</label>
                <input
                  type="text"
                  value={opportunityData.phone}
                  onChange={(e) => setOpportunityData({ ...opportunityData, phone: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Telefone"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Empresa</label>
                <input
                  type="text"
                  value={opportunityData.company}
                  onChange={(e) => setOpportunityData({ ...opportunityData, company: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Empresa"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Valor</label>
                <input
                  type="number"
                  value={opportunityData.value}
                  onChange={(e) => setOpportunityData({ ...opportunityData, value: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Valor estimado"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Etapa</label>
                <select
                  value={opportunityData.stage}
                  onChange={(e) => setOpportunityData({ ...opportunityData, stage: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  {stages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-gray-300 mb-2">Descrição</label>
                <textarea
                  value={opportunityData.description}
                  onChange={(e) => setOpportunityData({ ...opportunityData, description: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Descrição da oportunidade"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowOpportunityModal(false)
                  resetOpportunityForm()
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpportunitySubmit}
                className="flex-1 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition duration-300 font-semibold"
              >
                Criar Oportunidade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-red-500/20 shadow-2xl">
            <h3 className="text-2xl font-bold text-red-400 mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir o prospect &quot;{clientToDelete?.name}&quot;?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setClientToDelete(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteClient}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}