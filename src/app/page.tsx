'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  name: string
  company_id?: string
  account_type: 'individual' | 'escritorio' | 'white_label'
  role: 'admin' | 'assessor'
  created_at: string
}

interface Company {
  id: string
  name: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  custom_domain?: string
  plan_type: 'individual' | 'escritorio' | 'white_label'
  white_label: boolean
  created_at: string
}

interface Prospect {
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
  prospect_id: string
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

interface Plan {
  name: string
  price: string
  features: string[]
  type: 'individual' | 'escritorio' | 'white_label'
}

interface TeamMember {
  id: string
  name: string
  email: string
  prospects_count: number
  conversions: number
  score: number
}

export default function CRMAssessor() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null)
  const [userCompany, setUserCompany] = useState<Company | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('landing')

  // Data states
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])

  // UI states
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [showProspectModal, setShowProspectModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showOpportunityModal, setShowOpportunityModal] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{type: string, id: string} | null>(null)
  const [currentFunnelType, setCurrentFunnelType] = useState('')

  // Form states
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    account_type: 'individual' as 'individual' | 'escritorio' | 'white_label'
  })

  const [prospectData, setProspectData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    aum_value: '',
    priority: 'Média prioridade',
    pipeline_stage: 'Qualificação'
  })

  const [activityData, setActivityData] = useState({
    prospect_id: '',
    type: 'Follow-up',
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

  const [companyData, setCompanyData] = useState({
    name: '',
    logo_url: '',
    primary_color: '#fbbf24',
    secondary_color: '#f59e0b',
    custom_domain: ''
  })

  const [teamMemberData, setTeamMemberData] = useState({
    name: '',
    email: '',
    password: ''
  })

  // Constants
  const pipelineStages = ['Qualificação', 'Apresentação', 'Proposta', 'Negociação', 'Ativação']
  const priorityLevels = ['Alta prioridade', 'Média prioridade', 'Baixa prioridade']
  const activityTypes = ['Follow-up', 'Reunião', 'Proposta', 'Contrato', 'Pós-venda']
  const funnelTypes = ['Consórcio', 'Seguros', 'Câmbio', 'Eventos']

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Load user data from localStorage (removing Supabase user_profiles dependency)
        const userData = loadUserData(authUser.id)
        if (userData) {
          setUser(userData)
          setCurrentPage('dashboard')
        } else {
          // Create user data if doesn't exist
          const newUserData: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email || '',
            account_type: 'individual',
            role: 'assessor',
            created_at: new Date().toISOString()
          }
          saveUserData(newUserData)
          setUser(newUserData)
          setCurrentPage('dashboard')
        }
      } else {
        setCurrentPage('landing')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setCurrentPage('landing')
    } finally {
      setLoading(false)
    }
  }

  // Local storage functions
  const saveUserData = (userData: User) => {
    localStorage.setItem(`crm-user-${userData.id}`, JSON.stringify(userData))
    
    // Also save in global users list
    const users = JSON.parse(localStorage.getItem('crm-users') || '[]')
    const existingIndex = users.findIndex((u: User) => u.id === userData.id)
    if (existingIndex >= 0) {
      users[existingIndex] = userData
    } else {
      users.push(userData)
    }
    localStorage.setItem('crm-users', JSON.stringify(users))
  }

  const loadUserData = (userId: string): User | null => {
    const userData = localStorage.getItem(`crm-user-${userId}`)
    if (userData) {
      const parsedUser = JSON.parse(userData)
      loadLinkedData(parsedUser)
      return parsedUser
    }
    return null
  }

  const loadLinkedData = (userData: User) => {
    try {
      // Load company if user has one
      if (userData.company_id) {
        const company = loadCompanyData(userData.company_id)
        if (company) {
          setUserCompany(company)
          // Load team members if user is admin
          if (userData.role === 'admin') {
            loadTeamMembers(userData.company_id)
          }
        }
      }

      // Load prospects
      const savedProspects = localStorage.getItem(`crm-prospects-${userData.id}`)
      if (savedProspects) {
        setProspects(JSON.parse(savedProspects))
      }

      // Load activities
      const savedActivities = localStorage.getItem(`crm-activities-${userData.id}`)
      if (savedActivities) {
        setActivities(JSON.parse(savedActivities))
      }

      // Load opportunities
      const savedOpportunities = localStorage.getItem(`crm-opportunities-${userData.id}`)
      if (savedOpportunities) {
        setOpportunities(JSON.parse(savedOpportunities))
      }

      // If admin, load company-wide data
      if (userData.role === 'admin' && userData.company_id) {
        loadCompanyData(userData.company_id)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadTeamMembers = (companyId: string) => {
    try {
      const users = JSON.parse(localStorage.getItem('crm-users') || '[]')
      const members = users.filter((u: User) => u.company_id === companyId && u.role === 'assessor')
      
      const membersWithStats = members.map((member: User) => {
        const memberProspects = JSON.parse(localStorage.getItem(`crm-prospects-${member.id}`) || '[]')
        const conversions = memberProspects.filter((p: Prospect) => p.pipeline_stage === 'Ativação').length
        const score = memberProspects.length * 10 + conversions * 50
        
        return {
          id: member.id,
          name: member.name,
          email: member.email,
          prospects_count: memberProspects.length,
          conversions,
          score
        }
      })
      
      setTeamMembers(membersWithStats)
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const loadCompanyData = (companyId: string): Company | null => {
    try {
      const companyData = localStorage.getItem(`crm-company-${companyId}`)
      if (companyData) {
        return JSON.parse(companyData)
      }
    } catch (error) {
      console.error('Error loading company data:', error)
    }
    return null
  }

  const saveProspects = (userId: string, prospects: Prospect[]) => {
    localStorage.setItem(`crm-prospects-${userId}`, JSON.stringify(prospects))
  }

  const saveActivities = (userId: string, activities: Activity[]) => {
    localStorage.setItem(`crm-activities-${userId}`, JSON.stringify(activities))
  }

  const saveOpportunities = (userId: string, opportunities: Opportunity[]) => {
    localStorage.setItem(`crm-opportunities-${userId}`, JSON.stringify(opportunities))
  }

  const saveCompany = (company: Company) => {
    localStorage.setItem(`crm-company-${company.id}`, JSON.stringify(company))
  }

  // Auth functions
  const signUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: {
          data: {
            name: authData.name,
            account_type: authData.account_type
          }
        }
      })

      if (error) throw error

      alert('Conta criada com sucesso! Verifique seu email para ativar.')
      setCurrentPage('login')
    } catch (error) {
      console.error('Error signing up:', error)
      alert('Erro ao criar conta: ' + (error as Error).message)
    }
  }

  const signIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authData.email,
        password: authData.password,
      })

      if (error) throw error
      
      // Will trigger checkUser via useEffect
    } catch (error) {
      console.error('Error signing in:', error)
      alert('Erro ao fazer login: ' + (error as Error).message)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserCompany(null)
      setTeamMembers([])
      setProspects([])
      setActivities([])
      setOpportunities([])
      setCurrentPage('landing')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Data manipulation functions
  const handleProspectSubmit = () => {
    if (!user) return
    
    try {
      const newProspect: Prospect = {
        id: editingProspect?.id || Date.now().toString(),
        user_id: user.id,
        company_id: user.company_id,
        name: prospectData.name,
        email: prospectData.email,
        phone: prospectData.phone || undefined,
        company: prospectData.company || undefined,
        aum_value: prospectData.aum_value ? Number(prospectData.aum_value) : undefined,
        priority: prospectData.priority,
        pipeline_stage: prospectData.pipeline_stage,
        created_at: editingProspect?.created_at || new Date().toISOString()
      }

      let updatedProspects
      if (editingProspect) {
        updatedProspects = prospects.map(p => p.id === editingProspect.id ? newProspect : p)
        alert('Prospect atualizado com sucesso!')
      } else {
        updatedProspects = [...prospects, newProspect]
        alert('Prospect cadastrado com sucesso!')
      }

      setProspects(updatedProspects)
      saveProspects(user.id, updatedProspects.filter(p => p.user_id === user.id))
      
      // If admin, refresh company data
      if (user.role === 'admin' && user.company_id) {
        loadCompanyData(user.company_id)
        loadTeamMembers(user.company_id)
      }
      
      resetProspectForm()
    } catch (error) {
      alert('Erro ao salvar prospect: ' + error)
    }
  }

  const handleActivitySubmit = () => {
    if (!user) return
    
    try {
      const newActivity: Activity = {
        id: editingActivity?.id || Date.now().toString(),
        user_id: user.id,
        company_id: user.company_id,
        prospect_id: activityData.prospect_id,
        type: activityData.type,
        title: activityData.title,
        description: activityData.description || undefined,
        completed: false,
        scheduled_date: activityData.scheduled_date || undefined,
        created_at: editingActivity?.created_at || new Date().toISOString()
      }

      let updatedActivities
      if (editingActivity) {
        updatedActivities = activities.map(a => a.id === editingActivity.id ? newActivity : a)
        alert('Atividade atualizada com sucesso!')
      } else {
        updatedActivities = [...activities, newActivity]
        alert('Atividade criada com sucesso!')
      }

      setActivities(updatedActivities)
      saveActivities(user.id, updatedActivities.filter(a => a.user_id === user.id))
      resetActivityForm()
    } catch (error) {
      alert('Erro ao salvar atividade: ' + error)
    }
  }

  const handleOpportunitySubmit = () => {
    if (!user) return
    
    try {
      const newOpportunity: Opportunity = {
        id: Date.now().toString(),
        user_id: user.id,
        company_id: user.company_id,
        funnel_type: opportunityData.funnel_type,
        name: opportunityData.name,
        email: opportunityData.email,
        phone: opportunityData.phone || undefined,
        company: opportunityData.company || undefined,
        value: opportunityData.value ? Number(opportunityData.value) : undefined,
        description: opportunityData.description || undefined,
        stage: opportunityData.stage,
        created_at: new Date().toISOString()
      }

      const updatedOpportunities = [...opportunities, newOpportunity]
      setOpportunities(updatedOpportunities)
      saveOpportunities(user.id, updatedOpportunities.filter(o => o.user_id === user.id))
      resetOpportunityForm()
      
      alert('Oportunidade criada com sucesso!')
    } catch (error) {
      alert('Erro ao salvar oportunidade: ' + error)
    }
  }

  const handleDelete = () => {
    if (!deleteConfirm || !user) return

    try {
      if (deleteConfirm.type === 'prospect') {
        const updatedProspects = prospects.filter(p => p.id !== deleteConfirm.id)
        setProspects(updatedProspects)
        saveProspects(user.id, updatedProspects.filter(p => p.user_id === user.id))
        alert('Prospect deletado com sucesso!')
      } else {
        const updatedActivities = activities.filter(a => a.id !== deleteConfirm.id)
        setActivities(updatedActivities)
        saveActivities(user.id, updatedActivities.filter(a => a.user_id === user.id))
        alert('Atividade deletada com sucesso!')
      }

      setDeleteConfirm(null)
    } catch (error) {
      alert('Erro ao deletar: ' + error)
    }
  }

  const handlePipelineMove = (prospectId: string, newStage: string) => {
    if (!user) return

    try {
      const updatedProspects = prospects.map(p => 
        p.id === prospectId ? { ...p, pipeline_stage: newStage } : p
      )
      setProspects(updatedProspects)
      
      // Find the prospect and save to the correct user
      const prospect = updatedProspects.find(p => p.id === prospectId)
      if (prospect) {
        const userProspects = updatedProspects.filter(p => p.user_id === prospect.user_id)
        saveProspects(prospect.user_id, userProspects)
      }
      
      // If admin, refresh team stats
      if (user.role === 'admin' && user.company_id) {
        loadTeamMembers(user.company_id)
      }
    } catch (error) {
      alert('Erro ao mover prospect: ' + error)
    }
  }

  const toggleActivityComplete = (activityId: string, completed: boolean) => {
    if (!user) return

    try {
      const updatedActivities = activities.map(a => 
        a.id === activityId ? { 
          ...a, 
          completed, 
          completed_date: completed ? new Date().toISOString() : undefined 
        } : a
      )
      setActivities(updatedActivities)
      
      // Find the activity and save to the correct user
      const activity = updatedActivities.find(a => a.id === activityId)
      if (activity) {
        const userActivities = updatedActivities.filter(a => a.user_id === activity.user_id)
        saveActivities(activity.user_id, userActivities)
      }
    } catch (error) {
      alert('Erro ao atualizar atividade: ' + error)
    }
  }

  // Helper functions
  const resetProspectForm = () => {
    setProspectData({
      name: '',
      email: '',
      phone: '',
      company: '',
      aum_value: '',
      priority: 'Média prioridade',
      pipeline_stage: 'Qualificação'
    })
    setEditingProspect(null)
    setShowProspectModal(false)
  }

  const resetActivityForm = () => {
    setActivityData({
      prospect_id: '',
      type: 'Follow-up',
      title: '',
      description: '',
      scheduled_date: ''
    })
    setEditingActivity(null)
    setShowActivityModal(false)
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
    setShowOpportunityModal(false)
  }

  const handleEditProspect = (prospect: Prospect) => {
    setProspectData({
      name: prospect.name,
      email: prospect.email,
      phone: prospect.phone || '',
      company: prospect.company || '',
      aum_value: prospect.aum_value?.toString() || '',
      priority: prospect.priority,
      pipeline_stage: prospect.pipeline_stage
    })
    setEditingProspect(prospect)
    setShowProspectModal(true)
  }

  const handleEditActivity = (activity: Activity) => {
    setActivityData({
      prospect_id: activity.prospect_id,
      type: activity.type,
      title: activity.title,
      description: activity.description || '',
      scheduled_date: activity.scheduled_date?.split('T')[0] || ''
    })
    setEditingActivity(activity)
    setShowActivityModal(true)
  }

  // Ranking calculation
  const generateRanking = () => {
    if (user?.role === 'admin' && teamMembers.length > 0) {
      // Company internal ranking
      return {
        ranking: teamMembers.slice(0, 3),
        userPosition: 1,
        totalUsers: teamMembers.length,
        userScore: 0,
        isCompanyRanking: true
      }
    } else {
      // Global ranking
      const mockUsers = [
        { name: 'João Silva', score: 850 },
        { name: 'Maria Santos', score: 820 },
        { name: 'Pedro Costa', score: 780 },
        { name: user?.name || 'Você', score: 750 },
        { name: 'Ana Lima', score: 720 },
        { name: 'Carlos Oliveira', score: 680 }
      ]

      const sorted = mockUsers.sort((a, b) => b.score - a.score)
      const userPosition = sorted.findIndex(u => u.name === (user?.name || 'Você')) + 1
      const totalUsers = sorted.length

      return {
        ranking: sorted.slice(0, 3),
        userPosition,
        totalUsers,
        userScore: 750,
        isCompanyRanking: false
      }
    }
  }

  // Filter functions
  const getFilteredProspects = () => {
    if (user?.role === 'admin') {
      // Admin sees all company prospects
      return prospects.filter(prospect =>
        prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    } else {
      // Regular users see only their prospects
      return prospects.filter(prospect =>
        prospect.user_id === user?.id &&
        (prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         prospect.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
  }

  const filteredProspects = getFilteredProspects()
  const userProspects = user?.role === 'admin' ? prospects : prospects.filter(p => p.user_id === user?.id)
  const userActivities = user?.role === 'admin' ? activities : activities.filter(a => a.user_id === user?.id)
  const pendingActivities = userActivities.filter(activity => !activity.completed)
  const completedActivities = userActivities.filter(activity => activity.completed)

  // KPI calculations
  const totalProspects = userProspects.length
  const conversions = userProspects.filter(p => p.pipeline_stage === 'Ativação').length
  const conversionRate = totalProspects > 0 ? ((conversions / totalProspects) * 100).toFixed(1) : '0'
  const totalAUM = userProspects.reduce((sum, p) => sum + (p.aum_value || 0), 0)

  // Dynamic branding
  const getBrandName = () => {
    if (userCompany?.plan_type === 'white_label' && userCompany.name) {
      return userCompany.name
    }
    return 'CRM do Assessor'
  }

  const getBrandColors = () => {
    if (userCompany?.plan_type === 'white_label') {
      return {
        primary: userCompany.primary_color || '#fbbf24',
        secondary: userCompany.secondary_color || '#f59e0b'
      }
    }
    return {
      primary: '#fbbf24',
      secondary: '#f59e0b'
    }
  }

  const brandColors = getBrandColors()

  // Plans data
  const plans: Plan[] = [
    {
      name: "Individual",
      price: "R$ 47",
      features: ["Nível básico", "Pipeline essencial + atividades", "Relatórios básicos", "Suporte por email"],
      type: "individual"
    },
    {
      name: "Escritório", 
      price: "R$ 197",
      features: ["Nível avançado", "Gestão de equipe", "Dashboard consolidado", "Ranking interno", "Suporte prioritário"],
      type: "escritorio"
    },
    {
      name: "White Label",
      price: "R$ 497", 
      features: ["Recursos ilimitados", "Marca personalizada", "Logo e cores customizadas", "Domínio próprio", "Suporte dedicado"],
      type: "white_label"
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-400 text-xl">Carregando...</div>
      </div>
    )
  }

  // Landing Page
  if (currentPage === 'landing') {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="border-b border-gray-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold" style={{color: brandColors.primary}}>
              {getBrandName()}
            </h1>
            <div className="space-x-4">
              <button
                onClick={() => setCurrentPage('login')}
                className="text-gray-300 hover:text-white px-4 py-2 rounded-md transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => setCurrentPage('signup')}
                className="px-6 py-2 rounded-md font-semibold transition-colors"
                style={{
                  backgroundColor: brandColors.primary,
                  color: 'black'
                }}
              >
                Começar Grátis
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            CRM Especializado para{' '}
            <span style={{color: brandColors.primary}}>Assessores de Investimento</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Gerencie prospects, atividades e oportunidades com o sistema mais completo do mercado financeiro brasileiro
          </p>
          <button
            onClick={() => setCurrentPage('signup')}
            className="px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            style={{
              backgroundColor: brandColors.primary,
              color: 'black'
            }}
          >
            Começar Teste Grátis
          </button>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Funcionalidades Exclusivas</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4" style={{color: brandColors.primary}}>
                Pipeline Inteligente
              </h3>
              <p className="text-gray-300">
                Acompanhe cada prospect desde a qualificação até a ativação com nosso pipeline especializado
              </p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4" style={{color: brandColors.primary}}>
                Gestão de Atividades
              </h3>
              <p className="text-gray-300">
                Never miss a follow-up again. Sistema completo de tarefas e lembretes
              </p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4" style={{color: brandColors.primary}}>
                Ranking de Performance
              </h3>
              <p className="text-gray-300">
                Compare sua performance com outros assessores e melhore continuamente
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Planos e Preços</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div key={plan.name} className={`bg-gray-900 p-8 rounded-lg relative ${
                index === 1 ? 'ring-2' : ''
              }`} style={index === 1 ? {ringColor: brandColors.primary} : {}}>
                {index === 1 && (
                  <div 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-black text-sm font-semibold"
                    style={{backgroundColor: brandColors.primary}}
                  >
                    Mais Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                <p className="text-4xl font-bold mb-6" style={{color: brandColors.primary}}>
                  {plan.price}<span className="text-lg text-gray-400">/mês</span>
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="text-green-400 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setCurrentPage('signup')}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    index === 1 
                      ? 'text-black' 
                      : 'text-gray-300 border border-gray-700 hover:border-gray-600'
                  }`}
                  style={index === 1 ? {backgroundColor: brandColors.primary} : {}}
                >
                  Começar Agora
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-gray-400">
              <p>&copy; 2024 {getBrandName()}. Todos os direitos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // Auth Pages
  if (currentPage === 'signup') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6" style={{color: brandColors.primary}}>
            Entre no {getBrandName()}
          </h2>
          
          <div className="space-y-4">
            <select
              value={authData.account_type}
              onChange={(e) => setAuthData({...authData, account_type: e.target.value as any})}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="individual">Assessor Individual</option>
              <option value="escritorio">Escritório de Investimentos</option>
              <option value="white_label">White Label</option>
            </select>
            <input
              type="text"
              placeholder="Nome completo"
              value={authData.name}
              onChange={(e) => setAuthData({...authData, name: e.target.value})}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
            <input
              type="email"
              placeholder="Email"
              value={authData.email}
              onChange={(e) => setAuthData({...authData, email: e.target.value})}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
            <input
              type="password"
              placeholder="Senha"
              value={authData.password}
              onChange={(e) => setAuthData({...authData, password: e.target.value})}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
            <button
              onClick={signUp}
              className="w-full p-3 rounded-md font-semibold transition-colors"
              style={{
                backgroundColor: brandColors.primary,
                color: 'black'
              }}
            >
              Criar Conta
            </button>
          </div>
          
          <p className="text-center mt-4 text-gray-300">
            Já tem conta?{' '}
            <button 
              onClick={() => setCurrentPage('login')}
              className="hover:underline"
              style={{color: brandColors.primary}}
            >
              Entrar
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6" style={{color: brandColors.primary}}>
            Entrar no {getBrandName()}
          </h2>
          
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={authData.email}
              onChange={(e) => setAuthData({...authData, email: e.target.value})}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
            <input
              type="password"
              placeholder="Senha"
              value={authData.password}
              onChange={(e) => setAuthData({...authData, password: e.target.value})}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
            <button
              onClick={signIn}
              className="w-full p-3 rounded-md font-semibold transition-colors"
              style={{
                backgroundColor: brandColors.primary,
                color: 'black'
              }}
            >
              Entrar
            </button>
          </div>
          
          <p className="text-center mt-4 text-gray-300">
            Não tem conta?{' '}
            <button 
              onClick={() => setCurrentPage('signup')}
              className="hover:underline"
              style={{color: brandColors.primary}}
            >
              Criar conta
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-black shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold" style={{color: brandColors.primary}}>
            {getBrandName()}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">
              {user?.name} {user?.role === 'admin' && '(Admin)'}
            </span>
            <button
              onClick={signOut}
              className="bg-red-600 px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {['overview', 'prospects', 'activities', 'pipeline', 'consorcio', 'seguros', 'cambio', 'eventos', 'ranking'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-white'
                    : 'border-transparent text-gray-300 hover:text-white'
                }`}
                style={activeTab === tab ? {borderColor: brandColors.primary, color: brandColors.primary} : {}}
              >
                {tab === 'overview' && 'Visão Geral'}
                {tab === 'prospects' && 'Prospects'}
                {tab === 'activities' && 'Atividades'}
                {tab === 'pipeline' && 'Pipeline'}
                {tab === 'consorcio' && 'Consórcio'}
                {tab === 'seguros' && 'Seguros'}
                {tab === 'cambio' && 'Câmbio'}
                {tab === 'eventos' && 'Eventos'}
                {tab === 'ranking' && '🏆 Ranking'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold" style={{color: brandColors.primary}}>
              Dashboard {user?.role === 'admin' ? '(Visão da Equipe)' : ''}
            </h2>
            
            {/* KPIs */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Total de Prospects</h3>
                <p className="text-3xl font-bold" style={{color: brandColors.primary}}>{totalProspects}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Taxa de Conversão</h3>
                <p className="text-3xl font-bold text-green-400">{conversionRate}%</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">AUM Total</h3>
                <p className="text-3xl font-bold text-blue-400">R$ {totalAUM.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Atividades Pendentes</h3>
                <p className="text-3xl font-bold text-orange-400">{pendingActivities.length}</p>
              </div>
            </div>

            {/* Team Stats (Admin only) */}
            {user?.role === 'admin' && teamMembers.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4" style={{color: brandColors.primary}}>
                  Performance da Equipe
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {teamMembers.slice(0, 3).map(member => (
                    <div key={member.id} className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-semibold">{member.name}</h4>
                      <p className="text-sm text-gray-300">{member.prospects_count} prospects</p>
                      <p className="text-sm text-green-400">{member.conversions} conversões</p>
                      <p className="text-sm" style={{color: brandColors.primary}}>Score: {member.score}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activities */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4" style={{color: brandColors.primary}}>
                Atividades Recentes
              </h3>
              <div className="space-y-3">
                {pendingActivities.slice(0, 5).map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-gray-400">{activity.type}</p>
                    </div>
                    <button
                      onClick={() => toggleActivityComplete(activity.id, true)}
                      className="px-3 py-1 rounded text-sm"
                      style={{backgroundColor: brandColors.primary, color: 'black'}}
                    >
                      Concluir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Prospects Tab */}
        {activeTab === 'prospects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold" style={{color: brandColors.primary}}>
                Prospects {user?.role === 'admin' ? '(Toda a Equipe)' : ''}
              </h2>
              <button
                onClick={() => setShowProspectModal(true)}
                className="px-6 py-2 rounded-lg font-semibold"
                style={{backgroundColor: brandColors.primary, color: 'black'}}
              >
                + Novo Prospect
              </button>
            </div>

            {/* Search */}
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="Buscar prospects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
              />
            </div>

            {/* Prospects Table */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        AUM
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Stage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredProspects.map((prospect) => (
                      <tr key={prospect.id} className="hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{prospect.name}</div>
                          {user?.role === 'admin' && (
                            <div className="text-xs text-gray-400">
                              👤 {teamMembers.find(m => m.id === prospect.user_id)?.name || 'N/A'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{prospect.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{prospect.company || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {prospect.aum_value ? `R$ ${prospect.aum_value.toLocaleString()}` : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-600 text-white">
                            {prospect.pipeline_stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {(prospect.user_id === user?.id || user?.role === 'admin') && (
                            <div className="space-x-2">
                              <button
                                onClick={() => handleEditProspect(prospect)}
                                className="hover:underline"
                                style={{color: brandColors.primary}}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({type: 'prospect', id: prospect.id})}
                                className="text-red-400 hover:text-red-300"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold" style={{color: brandColors.primary}}>
                Atividades {user?.role === 'admin' ? '(Toda a Equipe)' : ''}
              </h2>
              <button
                onClick={() => setShowActivityModal(true)}
                className="px-6 py-2 rounded-lg font-semibold"
                style={{backgroundColor: brandColors.primary, color: 'black'}}
              >
                + Nova Atividade
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Pending Activities */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-orange-400">
                  Atividades Pendentes ({pendingActivities.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingActivities.map(activity => (
                    <div key={activity.id} className="bg-gray-700 p-4 rounded-md">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{activity.title}</h4>
                          <p className="text-gray-400 text-sm">{activity.type}</p>
                          {activity.scheduled_date && (
                            <p className="text-gray-400 text-sm">
                              📅 {new Date(activity.scheduled_date).toLocaleDateString()}
                            </p>
                          )}
                          {user?.role === 'admin' && (
                            <p className="text-blue-400 text-sm">
                              👤 {teamMembers.find(m => m.id === activity.user_id)?.name || 'N/A'}
                            </p>
                          )}
                        </div>
                        {(activity.user_id === user?.id || user?.role === 'admin') && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleActivityComplete(activity.id, true)}
                              className="px-2 py-1 rounded text-sm"
                              style={{backgroundColor: brandColors.primary, color: 'black'}}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleEditActivity(activity)}
                              className="bg-gray-600 text-white px-2 py-1 rounded text-sm hover:bg-gray-500 transition-colors"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completed Activities */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-green-400">
                  Atividades Concluídas ({completedActivities.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {completedActivities.map(activity => (
                    <div key={activity.id} className="bg-gray-800 p-4 rounded-md opacity-75">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white line-through">{activity.title}</h4>
                          <p className="text-gray-400 text-sm">{activity.type}</p>
                          {activity.completed_date && (
                            <p className="text-gray-400 text-sm">
                              ✅ {new Date(activity.completed_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleActivityComplete(activity.id, false)}
                          className="bg-gray-600 text-white px-2 py-1 rounded text-sm hover:bg-gray-500 transition-colors"
                        >
                          Reabrir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold" style={{color: brandColors.primary}}>
              Pipeline de Prospecção {user?.role === 'admin' ? '(Toda a Equipe)' : ''}
            </h2>
            
            <div className="grid md:grid-cols-5 gap-4">
              {pipelineStages.map(stage => {
                const stageProspects = userProspects.filter(p => p.pipeline_stage === stage)
                return (
                  <div key={stage} className="bg-gray-900 p-4 rounded-lg">
                    <h3 className="font-semibold text-white mb-4">{stage} ({stageProspects.length})</h3>
                    <div className="space-y-3">
                      {stageProspects.map(prospect => {
                        const prospectOwner = user?.role === 'admin' ? 
                          teamMembers.find(m => m.id === prospect.user_id) : null
                        
                        return (
                          <div key={prospect.id} className="bg-gray-800 p-3 rounded-md">
                            <h4 className="font-semibold text-white text-sm">{prospect.name}</h4>
                            <p className="text-gray-400 text-xs">{prospect.email}</p>
                            {prospectOwner && (
                              <p className="text-blue-400 text-xs">👤 {prospectOwner.name}</p>
                            )}
                            {prospect.aum_value && (
                              <p className="text-green-400 text-xs">R$ {prospect.aum_value.toLocaleString()}</p>
                            )}
                            {(prospect.user_id === user?.id || user?.role === 'admin') && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {pipelineStages.map(targetStage => (
                                  targetStage !== stage && (
                                    <button
                                      key={targetStage}
                                      onClick={() => handlePipelineMove(prospect.id, targetStage)}
                                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-500 transition-colors"
                                      title={`Mover para ${targetStage}`}
                                    >
                                      →
                                    </button>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Funnel Tabs */}
        {(['consorcio', 'seguros', 'cambio', 'eventos'].includes(activeTab)) && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold" style={{color: brandColors.primary}}>
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              <button
                onClick={() => {
                  setCurrentFunnelType(activeTab)
                  setShowOpportunityModal(true)
                }}
                className="px-6 py-2 rounded-lg font-semibold"
                style={{backgroundColor: brandColors.primary, color: 'black'}}
              >
                + Nova Oportunidade
              </button>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Oportunidades em {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
              <div className="space-y-3">
                {opportunities
                  .filter(o => o.funnel_type === activeTab)
                  .map(opportunity => (
                  <div key={opportunity.id} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{opportunity.name}</h4>
                        <p className="text-gray-400 text-sm">{opportunity.email}</p>
                        {opportunity.value && (
                          <p className="text-green-400 text-sm">R$ {opportunity.value.toLocaleString()}</p>
                        )}
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-600 text-white">
                        {opportunity.stage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ranking Tab */}
        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold" style={{color: brandColors.primary}}>
              🏆 Ranking de Performance
            </h2>
            
            {(() => {
              const rankingData = generateRanking()
              return (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* User Position */}
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Sua Posição</h3>
                    <div className="text-center">
                      <p className="text-4xl font-bold mb-2" style={{color: brandColors.primary}}>
                        #{rankingData.userPosition}
                      </p>
                      <p className="text-gray-300">de {rankingData.totalUsers} assessores</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Score: {rankingData.userScore} pontos
                      </p>
                    </div>
                  </div>

                  {/* Top Ranking */}
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
                    <div className="space-y-3">
                      {rankingData.ranking.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className={`
                              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                              ${index === 0 ? 'bg-yellow-400 text-black' : 
                                index === 1 ? 'bg-gray-400 text-black' : 
                                'bg-yellow-600 text-white'}
                            `}>
                              {index + 1}
                            </span>
                            <span className="font-medium">{user.name}</span>
                          </div>
                          <span className="font-bold" style={{color: brandColors.primary}}>
                            {user.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </main>

      {/* Modals */}
      {/* Prospect Modal */}
      {showProspectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {editingProspect ? 'Editar' : 'Novo'} Prospect
            </h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome completo"
                value={prospectData.name}
                onChange={(e) => setProspectData({...prospectData, name: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={prospectData.email}
                onChange={(e) => setProspectData({...prospectData, email: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="text"
                placeholder="Telefone"
                value={prospectData.phone}
                onChange={(e) => setProspectData({...prospectData, phone: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="text"
                placeholder="Empresa"
                value={prospectData.company}
                onChange={(e) => setProspectData({...prospectData, company: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="number"
                placeholder="Valor AUM (R$)"
                value={prospectData.aum_value}
                onChange={(e) => setProspectData({...prospectData, aum_value: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <select
                value={prospectData.priority}
                onChange={(e) => setProspectData({...prospectData, priority: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                {priorityLevels.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
              <select
                value={prospectData.pipeline_stage}
                onChange={(e) => setProspectData({...prospectData, pipeline_stage: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                {pipelineStages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleProspectSubmit}
                className="flex-1 p-3 rounded-md font-semibold"
                style={{backgroundColor: brandColors.primary, color: 'black'}}
              >
                {editingProspect ? 'Atualizar' : 'Criar'}
              </button>
              <button
                onClick={resetProspectForm}
                className="flex-1 bg-gray-600 text-white p-3 rounded-md font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              {editingActivity ? 'Editar' : 'Nova'} Atividade
            </h3>
            
            <div className="space-y-4">
              <select
                value={activityData.prospect_id}
                onChange={(e) => setActivityData({...activityData, prospect_id: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">Selecionar prospect...</option>
                {userProspects.map(prospect => (
                  <option key={prospect.id} value={prospect.id}>
                    {prospect.name}
                  </option>
                ))}
              </select>
              <select
                value={activityData.type}
                onChange={(e) => setActivityData({...activityData, type: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                {activityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Título da atividade"
                value={activityData.title}
                onChange={(e) => setActivityData({...activityData, title: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <textarea
                placeholder="Descrição"
                value={activityData.description}
                onChange={(e) => setActivityData({...activityData, description: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white h-24"
              />
              <input
                type="date"
                value={activityData.scheduled_date}
                onChange={(e) => setActivityData({...activityData, scheduled_date: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleActivitySubmit}
                className="flex-1 p-3 rounded-md font-semibold"
                style={{backgroundColor: brandColors.primary, color: 'black'}}
              >
                {editingActivity ? 'Atualizar' : 'Criar'}
              </button>
              <button
                onClick={resetActivityForm}
                className="flex-1 bg-gray-600 text-white p-3 rounded-md font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Modal */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Nova Oportunidade</h3>
            
            <div className="space-y-4">
              <select
                value={opportunityData.funnel_type}
                onChange={(e) => setOpportunityData({...opportunityData, funnel_type: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">Selecionar tipo...</option>
                {funnelTypes.map(type => (
                  <option key={type} value={type.toLowerCase()}>{type}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nome completo"
                value={opportunityData.name}
                onChange={(e) => setOpportunityData({...opportunityData, name: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={opportunityData.email}
                onChange={(e) => setOpportunityData({...opportunityData, email: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="text"
                placeholder="Telefone"
                value={opportunityData.phone}
                onChange={(e) => setOpportunityData({...opportunityData, phone: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="text"
                placeholder="Empresa"
                value={opportunityData.company}
                onChange={(e) => setOpportunityData({...opportunityData, company: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="number"
                placeholder="Valor estimado (R$)"
                value={opportunityData.value}
                onChange={(e) => setOpportunityData({...opportunityData, value: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <textarea
                placeholder="Descrição"
                value={opportunityData.description}
                onChange={(e) => setOpportunityData({...opportunityData, description: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white h-24"
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleOpportunitySubmit}
                className="flex-1 p-3 rounded-md font-semibold"
                style={{backgroundColor: brandColors.primary, color: 'black'}}
              >
                Criar
              </button>
              <button
                onClick={resetOpportunityForm}
                className="flex-1 bg-gray-600 text-white p-3 rounded-md font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir este {deleteConfirm.type === 'prospect' ? 'prospect' : 'item'}?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white p-3 rounded-md font-semibold hover:bg-red-700 transition-colors"
              >
                Sim, Excluir
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-600 text-white p-3 rounded-md font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}