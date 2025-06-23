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
}

interface Company {
  id: string
  name: string
  manager_id: string
  plan_type: string
  white_label?: boolean
  logo_url?: string
  primary_color?: string
  secondary_color?: string
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
  const [activeTab, setActiveTab] = useState('overview')
  const [showClientModal, setShowClientModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showOpportunityModal, setShowOpportunityModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{type: string, id: string} | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form states
  const [clientData, setClientData] = useState({
    name: '', email: '', phone: '', company: '', aum_value: '', 
    priority: 'Média prioridade', pipeline_stage: 'Qualificação', 
    risk_profile: '', notes: ''
  })
  const [activityData, setActivityData] = useState({
    client_id: '', type: 'Ligação', title: '', description: '', 
    scheduled_date: ''
  })
  const [opportunityData, setOpportunityData] = useState({
    funnel_type: '', name: '', email: '', phone: '', company: '', 
    value: '', description: '', stage: 'Qualificação'
  })
  const [editingClient, setEditingClient] = useState<string | null>(null)

  // Auth form states
  const [authData, setAuthData] = useState({
    email: '', password: '', name: '', accountType: 'individual',
    companyName: '', companyPlan: 'office'
  })

  // Company branding
  const primaryColor = userCompany?.primary_color || '#fbbf24'
  const secondaryColor = userCompany?.secondary_color || '#f59e0b'
  const companyName = userCompany?.name || 'CRM do Assessor'

  // Auth effects
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await loadUserProfile(session.user.id)
        setCurrentPage('dashboard')
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select(`
          *,
          companies (*)
        `)
        .eq('user_id', userId)
        .single()

      if (profile) {
        setUserProfile(profile)
        if (profile.companies) {
          setUserCompany(profile.companies)
          setIsCompanyManager(profile.role === 'manager')
        }
      }
    } catch (error) {
      console.log('Usuário individual ou sem perfil criado')
    }
  }

  // Auth functions
  const handleSignUp = async () => {
    try {
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: {
          data: {
            name: authData.name
          }
        }
      })

      if (authError) throw authError

      if (signUpData.user) {
        // Create company if needed
        let companyId = null
        if (authData.accountType !== 'individual') {
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({
              name: authData.companyName,
              manager_id: signUpData.user.id,
              plan_type: authData.companyPlan,
              white_label: authData.companyPlan === 'white_label'
            })
            .select()
            .single()

          if (companyError) throw companyError
          companyId = company.id
        }

        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: signUpData.user.id,
            company_id: companyId,
            role: authData.accountType === 'individual' ? 'user' : 'manager',
            email: authData.email,
            name: authData.name
          })

        if (profileError) throw profileError

        alert('Conta criada com sucesso! Faça login para continuar.')
        setCurrentPage('login')
      }
    } catch (error: any) {
      alert('Erro ao criar conta: ' + error.message)
    }
  }

  const handleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authData.email,
        password: authData.password
      })

      if (error) throw error

      setUser(data.user)
      await loadUserProfile(data.user.id)
      setCurrentPage('dashboard')
    } catch (error: any) {
      alert('Erro ao fazer login: ' + error.message)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    setUserCompany(null)
    setIsCompanyManager(false)
    setCurrentPage('landing')
  }

  // Data loading functions
  useEffect(() => {
    if (user) {
      fetchClients()
      fetchActivities()
      fetchOpportunities()
      if (isCompanyManager) {
        fetchTeamMembers()
      }
    }
  }, [user, userProfile, isCompanyManager])

  const fetchClients = async () => {
    if (!user) return
    
    try {
      let query = supabase.from('clients').select('*, user_profiles(name, email)')
      
      if (isCompanyManager && userCompany) {
        query = query.eq('company_id', userCompany.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    }
  }

  const fetchActivities = async () => {
    if (!user) return
    
    try {
      let query = supabase.from('activities').select(`
        *, 
        clients(name),
        user_profiles(name, email)
      `)
      
      if (isCompanyManager && userCompany) {
        query = query.eq('company_id', userCompany.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Erro ao buscar atividades:', error)
    }
  }

  const fetchOpportunities = async () => {
    if (!user) return
    
    try {
      let query = supabase.from('opportunities').select('*, user_profiles(name, email)')
      
      if (isCompanyManager && userCompany) {
        query = query.eq('company_id', userCompany.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setOpportunities(data || [])
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error)
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
      
      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Erro ao buscar membros da equipe:', error)
    }
  }

  // CRUD functions
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
          .eq('id', editingClient)

        if (error) throw error
        alert('Prospect atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientPayload)

        if (error) throw error
        alert('Prospect cadastrado com sucesso!')
      }

      resetClientForm()
      fetchClients()
    } catch (error: any) {
      alert('Erro ao salvar prospect: ' + error.message)
    }
  }

  const handleActivitySubmit = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          company_id: userCompany?.id || null,
          client_id: activityData.client_id,
          type: activityData.type,
          title: activityData.title,
          description: activityData.description,
          scheduled_date: activityData.scheduled_date || null,
          completed: false
        })

      if (error) throw error
      alert('Atividade criada com sucesso!')
      resetActivityForm()
      fetchActivities()
    } catch (error: any) {
      alert('Erro ao criar atividade: ' + error.message)
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
      resetOpportunityForm()
      fetchOpportunities()
    } catch (error: any) {
      alert('Erro ao criar oportunidade: ' + error.message)
    }
  }

  // Reset forms
  const resetClientForm = () => {
    setClientData({
      name: '', email: '', phone: '', company: '', aum_value: '', 
      priority: 'Média prioridade', pipeline_stage: 'Qualificação', 
      risk_profile: '', notes: ''
    })
    setEditingClient(null)
    setShowClientModal(false)
  }

  const resetActivityForm = () => {
    setActivityData({
      client_id: '', type: 'Ligação', title: '', description: '', 
      scheduled_date: ''
    })
    setShowActivityModal(false)
  }

  const resetOpportunityForm = () => {
    setOpportunityData({
      funnel_type: '', name: '', email: '', phone: '', company: '', 
      value: '', description: '', stage: 'Qualificação'
    })
    setShowOpportunityModal(false)
  }

  // Utility functions
  const moveClientInPipeline = async (clientId: string, direction: 'forward' | 'backward') => {
    const stages = ['Qualificação', '1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação']
    const client = clients.find(c => c.id === clientId)
    if (!client) return

    const currentIndex = stages.indexOf(client.pipeline_stage)
    let newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1
    
    if (newIndex < 0 || newIndex >= stages.length) return

    try {
      const { error } = await supabase
        .from('clients')
        .update({ pipeline_stage: stages[newIndex] })
        .eq('id', clientId)

      if (error) throw error
      fetchClients()
    } catch (error: any) {
      alert('Erro ao mover prospect no pipeline: ' + error.message)
    }
  }

  const handleDeleteItem = async () => {
    if (!itemToDelete) return

    try {
      const { error } = await supabase
        .from(itemToDelete.type === 'client' ? 'clients' : 
              itemToDelete.type === 'activity' ? 'activities' : 'opportunities')
        .delete()
        .eq('id', itemToDelete.id)

      if (error) throw error

      alert(`${itemToDelete.type === 'client' ? 'Prospect' : 
             itemToDelete.type === 'activity' ? 'Atividade' : 'Oportunidade'} excluído com sucesso!`)
      
      if (itemToDelete.type === 'client') fetchClients()
      else if (itemToDelete.type === 'activity') fetchActivities()
      else fetchOpportunities()
      
      setShowDeleteModal(false)
      setItemToDelete(null)
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message)
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const calculateKPIs = () => {
    const totalClients = clients.length
    const totalAUM = clients.reduce((sum, client) => sum + (client.aum_value || 0), 0)
    const conversionRate = totalClients > 0 ? 
      (clients.filter(c => c.pipeline_stage === 'Ativação').length / totalClients * 100) : 0

    return { totalClients, totalAUM, conversionRate }
  }

  const { totalClients, totalAUM, conversionRate } = calculateKPIs()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-yellow-400 text-xl">Carregando...</div>
      </div>
    )
  }

  // Landing Page
  if (currentPage === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* Header */}
        <header className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold text-yellow-400">
            {companyName}
          </div>
          <div className="space-x-4">
            <button 
              onClick={() => setCurrentPage('login')}
              className="px-6 py-2 border border-yellow-400 text-yellow-400 rounded-md hover:bg-yellow-400 hover:text-black transition"
            >
              Entrar
            </button>
            <button 
              onClick={() => setCurrentPage('signup')}
              className="px-6 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition"
            >
              Começar Grátis
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            O CRM que <span className="text-yellow-400">Assessores</span> Realmente Usam
          </h1>
          <p className="text-xl mb-8 text-gray-300 max-w-3xl mx-auto">
            Gerencie prospects, atividades e pipeline em uma plataforma intuitiva. 
            Mais de 1.500+ assessores e consultores já confiam em nossa plataforma.
          </p>
        </section>

        {/* Pricing */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Planos Simples e Transparentes</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Starter",
                price: "R$ 47",
                period: "/mês",
                features: ["Nível básico", "Pipeline essencial + atividades", "Relatórios básicos", "Suporte por email"]
              },
              {
                name: "Professional", 
                price: "R$ 37",
                period: "/mês (anual)",
                features: ["Nível avançado", "Automações + relatórios + integrações", "Suporte prioritário", "Integrações avançadas"]
              },
              {
                name: "Enterprise",
                price: "R$ 197",
                period: "/mês",
                features: ["Multi-usuário", "White label", "Gestão de equipe", "Suporte dedicado"]
              }
            ].map((plan, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                <h3 className="text-xl font-bold mb-4">{plan.name}</h3>
                <div className="text-3xl font-bold text-yellow-400 mb-2">{plan.price}</div>
                <div className="text-gray-400 mb-6">{plan.period}</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-gray-300">✓ {feature}</li>
                  ))}
                </ul>
                <button 
                  onClick={() => setCurrentPage('signup')}
                  className="w-full py-3 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition"
                >
                  Começar
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  // Login Page
  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Entrar no {companyName}</h2>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={authData.email}
              onChange={(e) => setAuthData({...authData, email: e.target.value})}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
            />
            <input
              type="password"
              placeholder="Senha"
              value={authData.password}
              onChange={(e) => setAuthData({...authData, password: e.target.value})}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
            />
            <button
              onClick={handleSignIn}
              className="w-full py-3 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition font-semibold"
            >
              Entrar
            </button>
            <div className="text-center">
              <button
                onClick={() => setCurrentPage('signup')}
                className="text-yellow-400 hover:text-yellow-300"
              >
                Não tem conta? Cadastre-se
              </button>
            </div>
            <div className="text-center">
              <button
                onClick={() => setCurrentPage('landing')}
                className="text-gray-400 hover:text-gray-300"
              >
                ← Voltar
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Criar Conta</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nome completo"
              value={authData.name}
              onChange={(e) => setAuthData({...authData, name: e.target.value})}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
            />
            <input
              type="email"
              placeholder="E-mail"
              value={authData.email}
              onChange={(e) => setAuthData({...authData, email: e.target.value})}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
            />
            <input
              type="password"
              placeholder="Senha"
              value={authData.password}
              onChange={(e) => setAuthData({...authData, password: e.target.value})}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
            />
            
            <select
              value={authData.accountType}
              onChange={(e) => setAuthData({...authData, accountType: e.target.value})}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
            >
              <option value="individual">Assessor Individual</option>
              <option value="office">Escritório/Empresa</option>
              <option value="white_label">White Label</option>
            </select>

            {authData.accountType !== 'individual' && (
              <>
                <input
                  type="text"
                  placeholder="Nome da empresa"
                  value={authData.companyName}
                  onChange={(e) => setAuthData({...authData, companyName: e.target.value})}
                  className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
                />
                <select
                  value={authData.companyPlan}
                  onChange={(e) => setAuthData({...authData, companyPlan: e.target.value})}
                  className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
                >
                  <option value="office">Escritório (R$ 197/mês)</option>
                  <option value="white_label">White Label (R$ 497/mês)</option>
                </select>
              </>
            )}

            <button
              onClick={handleSignUp}
              className="w-full py-3 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition font-semibold"
            >
              Criar Conta
            </button>
            <div className="text-center">
              <button
                onClick={() => setCurrentPage('login')}
                className="text-yellow-400 hover:text-yellow-300"
              >
                Já tem conta? Entre
              </button>
            </div>
            <div className="text-center">
              <button
                onClick={() => setCurrentPage('landing')}
                className="text-gray-400 hover:text-gray-300"
              >
                ← Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-bold" style={{color: primaryColor}}>
              {companyName}
            </h1>
            {userCompany && (
              <span className="text-sm text-gray-400">
                {userCompany.name} | {isCompanyManager ? 'Gestor' : 'Assessor'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'prospects', label: '👥 Prospects' },
              { id: 'activities', label: '📋 Atividades' },
              { id: 'consorcio', label: '🏠 Consórcio' },
              { id: 'seguros', label: '🛡️ Seguros' },
              { id: 'cambio', label: '💱 Câmbio' },
              { id: 'eventos', label: '🎯 Eventos' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? `border-yellow-400 text-yellow-400`
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Dashboard Executivo</h2>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Total de Prospects</h3>
                <p className="text-3xl font-bold text-yellow-400">{totalClients}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">AUM Total</h3>
                <p className="text-3xl font-bold text-yellow-400">
                  R$ {totalAUM.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Taxa de Conversão</h3>
                <p className="text-3xl font-bold text-yellow-400">{conversionRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Pipeline */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Pipeline de Prospecção</h3>
              <div className="grid grid-cols-5 gap-4">
                {['Qualificação', '1ª Reunião', '2ª Reunião', 'Cadastro', 'Ativação'].map((stage) => (
                  <div key={stage} className="text-center">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">{stage}</h4>
                      <div className="text-2xl font-bold text-yellow-400">
                        {clients.filter(c => c.pipeline_stage === stage).length}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Members (if manager) */}
            {isCompanyManager && teamMembers.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Equipe</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-semibold">{member.name || member.email}</h4>
                      <p className="text-sm text-gray-400">{member.role === 'manager' ? 'Gestor' : 'Assessor'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prospects Tab */}
        {activeTab === 'prospects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Prospects</h2>
              <button
                onClick={() => setShowClientModal(true)}
                className="px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition"
              >
                + Novo Prospect
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar prospects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 rounded-md bg-gray-800 text-white border border-gray-600"
              />
            </div>

            {/* Prospects Table */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">Nome</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Prioridade</th>
                    <th className="px-6 py-3 text-left">Etapa</th>
                    <th className="px-6 py-3 text-left">AUM</th>
                    {isCompanyManager && <th className="px-6 py-3 text-left">Assessor</th>}
                    <th className="px-6 py-3 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4">{client.name}</td>
                      <td className="px-6 py-4">{client.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          client.priority === 'Alta prioridade' ? 'bg-red-600' :
                          client.priority === 'Média prioridade' ? 'bg-yellow-600' : 'bg-gray-600'
                        }`}>
                          {client.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">{client.pipeline_stage}</td>
                      <td className="px-6 py-4">
                        R$ {(client.aum_value || 0).toLocaleString('pt-BR')}
                      </td>
                      {isCompanyManager && (
                        <td className="px-6 py-4">
                          {client.user_profiles?.name || client.user_profiles?.email || 'N/A'}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => moveClientInPipeline(client.id, 'backward')}
                            className="p-1 bg-gray-600 text-white rounded hover:bg-gray-500"
                            title="Mover para trás"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => moveClientInPipeline(client.id, 'forward')}
                            className="p-1 bg-gray-600 text-white rounded hover:bg-gray-500"
                            title="Mover para frente"
                          >
                            →
                          </button>
                          <button
                            onClick={() => {
                              setEditingClient(client.id)
                              setClientData({
                                name: client.name,
                                email: client.email,
                                phone: client.phone || '',
                                company: client.company || '',
                                aum_value: client.aum_value?.toString() || '',
                                priority: client.priority,
                                pipeline_stage: client.pipeline_stage,
                                risk_profile: client.risk_profile || '',
                                notes: client.notes || ''
                              })
                              setShowClientModal(true)
                            }}
                            className="p-1 bg-blue-600 text-white rounded hover:bg-blue-500"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete({type: 'client', id: client.id})
                              setShowDeleteModal(true)
                            }}
                            className="p-1 bg-red-600 text-white rounded hover:bg-red-500"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredClients.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Nenhum prospect encontrado
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Atividades</h2>
              <button
                onClick={() => setShowActivityModal(true)}
                className="px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition"
              >
                + Nova Atividade
              </button>
            </div>

            {/* Activities List */}
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-400">{activity.title}</h3>
                      <p className="text-gray-300">{activity.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                        <span>Cliente: {activity.clients?.name || 'N/A'}</span>
                        <span>Tipo: {activity.type}</span>
                        {activity.scheduled_date && (
                          <span>Data: {new Date(activity.scheduled_date).toLocaleDateString('pt-BR')}</span>
                        )}
                        {isCompanyManager && activity.user_profiles && (
                          <span>Assessor: {activity.user_profiles.name || activity.user_profiles.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setItemToDelete({type: 'activity', id: activity.id})
                          setShowDeleteModal(true)
                        }}
                        className="p-1 bg-red-600 text-white rounded hover:bg-red-500"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Nenhuma atividade encontrada
                </div>
              )}
            </div>
          </div>
        )}

        {/* Funnel Tabs */}
        {['consorcio', 'seguros', 'cambio', 'eventos'].map((funnelType) => (
          activeTab === funnelType && (
            <div key={funnelType} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold capitalize">{funnelType}</h2>
                <button
                  onClick={() => {
                    setOpportunityData({...opportunityData, funnel_type: funnelType})
                    setShowOpportunityModal(true)
                  }}
                  className="px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition"
                >
                  + Nova Oportunidade
                </button>
              </div>

              {/* Opportunities List */}
              <div className="space-y-4">
                {opportunities
                  .filter(opp => opp.funnel_type === funnelType)
                  .map((opportunity) => (
                  <div key={opportunity.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-yellow-400">{opportunity.name}</h3>
                        <p className="text-gray-300">{opportunity.email}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                          <span>Etapa: {opportunity.stage}</span>
                          {opportunity.value && (
                            <span>Valor: R$ {opportunity.value.toLocaleString('pt-BR')}</span>
                          )}
                          {isCompanyManager && opportunity.user_profiles && (
                            <span>Assessor: {opportunity.user_profiles.name || opportunity.user_profiles.email}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setItemToDelete({type: 'opportunity', id: opportunity.id})
                            setShowDeleteModal(true)
                          }}
                          className="p-1 bg-red-600 text-white rounded hover:bg-red-500"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {opportunities.filter(opp => opp.funnel_type === funnelType).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    Nenhuma oportunidade encontrada para {funnelType}
                  </div>
                )}
              </div>
            </div>
          )
        ))}
      </main>

      {/* Modals */}
      
      {/* Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingClient ? 'Editar Prospect' : 'Novo Prospect'}
              </h3>
              <button onClick={resetClientForm} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome do prospect"
                value={clientData.name}
                onChange={(e) => setClientData({...clientData, name: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <input
                type="email"
                placeholder="Email do prospect"
                value={clientData.email}
                onChange={(e) => setClientData({...clientData, email: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <input
                type="tel"
                placeholder="Telefone"
                value={clientData.phone}
                onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <input
                type="text"
                placeholder="Empresa"
                value={clientData.company}
                onChange={(e) => setClientData({...clientData, company: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <input
                type="number"
                placeholder="Valor AUM"
                value={clientData.aum_value}
                onChange={(e) => setClientData({...clientData, aum_value: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <select
                value={clientData.priority}
                onChange={(e) => setClientData({...clientData, priority: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              >
                <option value="Baixa prioridade">Baixa prioridade</option>
                <option value="Média prioridade">Média prioridade</option>
                <option value="Alta prioridade">Alta prioridade</option>
              </select>
              <select
                value={clientData.pipeline_stage}
                onChange={(e) => setClientData({...clientData, pipeline_stage: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              >
                <option value="Qualificação">Qualificação</option>
                <option value="1ª Reunião">1ª Reunião</option>
                <option value="2ª Reunião">2ª Reunião</option>
                <option value="Cadastro">Cadastro</option>
                <option value="Ativação">Ativação</option>
              </select>
              <textarea
                placeholder="Observações"
                value={clientData.notes}
                onChange={(e) => setClientData({...clientData, notes: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
                rows={3}
              />
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={resetClientForm}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClientSubmit}
                  className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nova Atividade</h3>
              <button onClick={resetActivityForm} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <select
                value={activityData.client_id}
                onChange={(e) => setActivityData({...activityData, client_id: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              >
                <option value="">Selecione um prospect</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              <select
                value={activityData.type}
                onChange={(e) => setActivityData({...activityData, type: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              >
                <option value="Ligação">Ligação</option>
                <option value="E-mail">E-mail</option>
                <option value="Reunião">Reunião</option>
                <option value="Follow-up">Follow-up</option>
              </select>
              <input
                type="text"
                placeholder="Título da atividade"
                value={activityData.title}
                onChange={(e) => setActivityData({...activityData, title: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <textarea
                placeholder="Descrição"
                value={activityData.description}
                onChange={(e) => setActivityData({...activityData, description: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
                rows={3}
              />
              <input
                type="datetime-local"
                value={activityData.scheduled_date}
                onChange={(e) => setActivityData({...activityData, scheduled_date: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={resetActivityForm}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleActivitySubmit}
                  className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500"
                >
                  Criar Atividade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Modal */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nova Oportunidade</h3>
              <button onClick={resetOpportunityForm} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome"
                value={opportunityData.name}
                onChange={(e) => setOpportunityData({...opportunityData, name: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <input
                type="email"
                placeholder="Email"
                value={opportunityData.email}
                onChange={(e) => setOpportunityData({...opportunityData, email: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <input
                type="tel"
                placeholder="Telefone"
                value={opportunityData.phone}
                onChange={(e) => setOpportunityData({...opportunityData, phone: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <input
                type="number"
                placeholder="Valor estimado"
                value={opportunityData.value}
                onChange={(e) => setOpportunityData({...opportunityData, value: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              />
              <select
                value={opportunityData.stage}
                onChange={(e) => setOpportunityData({...opportunityData, stage: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
              >
                <option value="Qualificação">Qualificação</option>
                <option value="1ª Reunião">1ª Reunião</option>
                <option value="2ª Reunião">2ª Reunião</option>
                <option value="Cadastro">Cadastro</option>
                <option value="Ativação">Ativação</option>
              </select>
              <textarea
                placeholder="Descrição"
                value={opportunityData.description}
                onChange={(e) => setOpportunityData({...opportunityData, description: e.target.value})}
                className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600"
                rows={3}
              />
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={resetOpportunityForm}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpportunitySubmit}
                  className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500"
                >
                  Criar Oportunidade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir este {
                itemToDelete?.type === 'client' ? 'prospect' : 
                itemToDelete?.type === 'activity' ? 'atividade' : 'oportunidade'
              }?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setItemToDelete(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteItem}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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