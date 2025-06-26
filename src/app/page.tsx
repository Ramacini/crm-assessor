'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Prospect {
  id: string
  user_id: string
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
  prospect_id: string
  type: string
  title: string
  description?: string
  completed: boolean
  scheduled_date?: string
  completed_date?: string
  created_at: string
}

export default function CRMAssessor() {
  // Auth states
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('landing')

  // Data states
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [activities, setActivities] = useState<Activity[]>([])

  // UI states
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [showProspectModal, setShowProspectModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{type: string, id: string} | null>(null)

  // Form states
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    company: ''
  })

  const [prospectData, setProspectData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    aum_value: '',
    priority: 'Média',
    pipeline_stage: 'Novo Lead'
  })

  const [activityData, setActivityData] = useState({
    prospect_id: '',
    type: 'call',
    title: '',
    description: '',
    scheduled_date: ''
  })

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await loadData(user.id)
        setCurrentPage('dashboard')
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async (userId: string) => {
    try {
      // Carregar prospects
      const { data: prospectsData, error: prospectsError } = await supabase
        .from('prospects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (prospectsError) throw prospectsError
      setProspects(prospectsData || [])

      // Carregar atividades
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (activitiesError) throw activitiesError
      setActivities(activitiesData || [])

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const signUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: {
          data: {
            name: authData.name,
            company: authData.company
          }
        }
      })

      if (error) throw error

      alert('Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.')
      setCurrentPage('login')
    } catch (error) {
      console.error('Erro no cadastro:', error)
      alert('Erro no cadastro: ' + (error as Error).message)
    }
  }

  const signIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authData.email,
        password: authData.password,
      })

      if (error) throw error

      if (data.user) {
        setUser(data.user)
        await loadData(data.user.id)
        setCurrentPage('dashboard')
      }
    } catch (error) {
      console.error('Erro no login:', error)
      alert('Erro no login: ' + (error as Error).message)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProspects([])
      setActivities([])
      setCurrentPage('landing')
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  }

  const addProspect = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('prospects')
        .insert([{
          user_id: user.id,
          name: prospectData.name,
          email: prospectData.email,
          phone: prospectData.phone,
          company: prospectData.company,
          aum_value: prospectData.aum_value ? parseFloat(prospectData.aum_value) : null,
          priority: prospectData.priority,
          pipeline_stage: prospectData.pipeline_stage
        }])
        .select()

      if (error) throw error

      if (data) {
        setProspects([data[0], ...prospects])
        setShowProspectModal(false)
        setProspectData({
          name: '',
          email: '',
          phone: '',
          company: '',
          aum_value: '',
          priority: 'Média',
          pipeline_stage: 'Novo Lead'
        })
      }
    } catch (error) {
      console.error('Erro ao adicionar prospect:', error)
      alert('Erro ao adicionar prospect: ' + (error as Error).message)
    }
  }

  const updateProspect = async () => {
    if (!editingProspect) return

    try {
      const { data, error } = await supabase
        .from('prospects')
        .update({
          name: prospectData.name,
          email: prospectData.email,
          phone: prospectData.phone,
          company: prospectData.company,
          aum_value: prospectData.aum_value ? parseFloat(prospectData.aum_value) : null,
          priority: prospectData.priority,
          pipeline_stage: prospectData.pipeline_stage
        })
        .eq('id', editingProspect.id)
        .select()

      if (error) throw error

      if (data) {
        setProspects(prospects.map(p => p.id === editingProspect.id ? data[0] : p))
        setShowProspectModal(false)
        setEditingProspect(null)
        setProspectData({
          name: '',
          email: '',
          phone: '',
          company: '',
          aum_value: '',
          priority: 'Média',
          pipeline_stage: 'Novo Lead'
        })
      }
    } catch (error) {
      console.error('Erro ao atualizar prospect:', error)
      alert('Erro ao atualizar prospect: ' + (error as Error).message)
    }
  }

  const deleteProspect = async (prospectId: string) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', prospectId)

      if (error) throw error

      setProspects(prospects.filter(p => p.id !== prospectId))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Erro ao deletar prospect:', error)
      alert('Erro ao deletar prospect: ' + (error as Error).message)
    }
  }

  const addActivity = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([{
          user_id: user.id,
          prospect_id: activityData.prospect_id,
          type: activityData.type,
          title: activityData.title,
          description: activityData.description,
          scheduled_date: activityData.scheduled_date || null,
          completed: false
        }])
        .select()

      if (error) throw error

      if (data) {
        setActivities([data[0], ...activities])
        setShowActivityModal(false)
        setActivityData({
          prospect_id: '',
          type: 'call',
          title: '',
          description: '',
          scheduled_date: ''
        })
      }
    } catch (error) {
      console.error('Erro ao adicionar atividade:', error)
      alert('Erro ao adicionar atividade: ' + (error as Error).message)
    }
  }

  const toggleActivityComplete = async (activityId: string, completed: boolean) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .update({
          completed,
          completed_date: completed ? new Date().toISOString() : null
        })
        .eq('id', activityId)
        .select()

      if (error) throw error

      if (data) {
        setActivities(activities.map(a => a.id === activityId ? data[0] : a))
      }
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error)
    }
  }

  const openEditProspectModal = (prospect: Prospect) => {
    setEditingProspect(prospect)
    setProspectData({
      name: prospect.name,
      email: prospect.email,
      phone: prospect.phone || '',
      company: prospect.company || '',
      aum_value: prospect.aum_value?.toString() || '',
      priority: prospect.priority,
      pipeline_stage: prospect.pipeline_stage
    })
    setShowProspectModal(true)
  }

  const filteredProspects = prospects.filter(prospect =>
    prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prospect.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prospect.company && prospect.company.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStageColor = (stage: string) => {
    const colors = {
      'Novo Lead': 'bg-blue-500',
      'Contato Realizado': 'bg-yellow-500',
      'Reunião Agendada': 'bg-orange-500',
      'Proposta Enviada': 'bg-purple-500',
      'Fechado': 'bg-green-500',
      'Perdido': 'bg-red-500'
    }
    return colors[stage as keyof typeof colors] || 'bg-gray-500'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      'Alta': 'text-red-400',
      'Média': 'text-yellow-400',
      'Baixa': 'text-green-400'
    }
    return colors[priority as keyof typeof colors] || 'text-gray-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  // Landing Page
  if (currentPage === 'landing') {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-6">
              CRM do <span className="text-yellow-400">Assessor</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Sistema completo para gestão de prospects, atividades e vendas para assessores de investimento
            </p>
            <div className="space-x-4">
              <button
                onClick={() => setCurrentPage('login')}
                className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => setCurrentPage('signup')}
                className="border border-yellow-400 text-yellow-400 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-400 hover:text-black transition-colors"
              >
                Cadastrar
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">Gestão de Prospects</h3>
              <p className="text-gray-300">Organize seus prospects com pipeline personalizado e métricas de performance</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">Sistema de Atividades</h3>
              <p className="text-gray-300">Acompanhe todas as interações e mantenha o relacionamento ativo</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">Dashboard Avançado</h3>
              <p className="text-gray-300">Métricas em tempo real para otimizar sua performance de vendas</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-8">Planos</h2>
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black p-8 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4">Assessor Pro</h3>
                <p className="text-4xl font-bold mb-4">R$ 47/mês</p>
                <ul className="text-left space-y-2 mb-6">
                  <li>✓ Gestão ilimitada de prospects</li>
                  <li>✓ Pipeline personalizado</li>
                  <li>✓ Sistema de atividades</li>
                  <li>✓ Dashboard em tempo real</li>
                  <li>✓ Ranking de performance</li>
                  <li>✓ Suporte prioritário</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Auth Pages
  if (currentPage === 'signup') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-yellow-400">
            Criar Conta
          </h2>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nome completo"
              value={authData.name}
              onChange={(e) => setAuthData({...authData, name: e.target.value})}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
            <input
              type="text"
              placeholder="Empresa"
              value={authData.company}
              onChange={(e) => setAuthData({...authData, company: e.target.value})}
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
              className="w-full bg-yellow-400 text-black p-3 rounded-md font-semibold hover:bg-yellow-300 transition-colors"
            >
              Criar Conta
            </button>
          </div>
          
          <p className="text-center mt-4 text-gray-300">
            Já tem conta?{' '}
            <button 
              onClick={() => setCurrentPage('login')}
              className="text-yellow-400 hover:underline"
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
          <h2 className="text-2xl font-bold text-center mb-6 text-yellow-400">
            Entrar
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
              className="w-full bg-yellow-400 text-black p-3 rounded-md font-semibold hover:bg-yellow-300 transition-colors"
            >
              Entrar
            </button>
          </div>
          
          <p className="text-center mt-4 text-gray-300">
            Não tem conta?{' '}
            <button 
              onClick={() => setCurrentPage('signup')}
              className="text-yellow-400 hover:underline"
            >
              Criar conta
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Dashboard Principal
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-black shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-yellow-400">
            CRM do Assessor
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">
              {user?.user_metadata?.name || user?.email} 
              {user?.user_metadata?.company && ` (${user.user_metadata.company})`}
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
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('prospects')}
              className={`py-4 px-2 border-b-2 transition-colors ${
                activeTab === 'prospects'
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Prospects
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`py-4 px-2 border-b-2 transition-colors ${
                activeTab === 'activities'
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Atividades
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-3xl font-bold mb-8">Dashboard</h2>
            
            {/* Métricas */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Total Prospects</h3>
                <p className="text-3xl font-bold text-yellow-400">{prospects.length}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Atividades</h3>
                <p className="text-3xl font-bold text-blue-400">{activities.length}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Conversões</h3>
                <p className="text-3xl font-bold text-green-400">
                  {prospects.filter(p => 
                    p.pipeline_stage === 'Proposta Enviada' || 
                    p.pipeline_stage === 'Fechado'
                  ).length}
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">AUM Total</h3>
                <p className="text-3xl font-bold text-purple-400">
                  R$ {prospects.reduce((sum, p) => sum + (p.aum_value || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Pipeline */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-semibold mb-4">Pipeline de Vendas</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {['Novo Lead', 'Contato Realizado', 'Reunião Agendada', 'Proposta Enviada', 'Fechado', 'Perdido'].map(stage => {
                  const count = prospects.filter(p => p.pipeline_stage === stage).length
                  return (
                    <div key={stage} className="text-center">
                      <div className={`${getStageColor(stage)} h-2 rounded-full mb-2`}></div>
                      <p className="text-sm text-gray-400">{stage}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Atividades Recentes */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
              <div className="space-y-3">
                {activities.slice(0, 5).map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-gray-400">{activity.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        activity.completed ? 'bg-green-600' : 'bg-yellow-600'
                      }`}>
                        {activity.completed ? 'Concluída' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Prospects Tab */}
        {activeTab === 'prospects' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Prospects</h2>
              <button
                onClick={() => setShowProspectModal(true)}
                className="bg-yellow-400 text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
              >
                + Novo Prospect
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Buscar prospects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
              />
            </div>

            {/* Prospects List */}
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
                        Prioridade
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
                          <span className={`text-sm font-medium ${getPriorityColor(prospect.priority)}`}>
                            {prospect.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getStageColor(prospect.pipeline_stage)}`}>
                            {prospect.pipeline_stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openEditProspectModal(prospect)}
                            className="text-yellow-400 hover:text-yellow-300 mr-3"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({type: 'prospect', id: prospect.id})}
                            className="text-red-400 hover:text-red-300"
                          >
                            Excluir
                          </button>
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
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Atividades</h2>
              <button
                onClick={() => setShowActivityModal(true)}
                className="bg-yellow-400 text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
              >
                + Nova Atividade
              </button>
            </div>

            {/* Activities List */}
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{activity.title}</h3>
                    <button
                      onClick={() => toggleActivityComplete(activity.id, !activity.completed)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        activity.completed
                          ? 'bg-green-600 text-white'
                          : 'bg-yellow-600 text-white'
                      }`}
                    >
                      {activity.completed ? 'Concluída' : 'Marcar como Concluída'}
                    </button>
                  </div>
                  <p className="text-gray-300 mb-2">{activity.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>Tipo: {activity.type}</span>
                    {activity.scheduled_date && (
                      <span>Agendado: {new Date(activity.scheduled_date).toLocaleDateString()}</span>
                    )}
                    <span>Criado: {new Date(activity.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal Prospect */}
      {showProspectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {editingProspect ? 'Editar Prospect' : 'Novo Prospect'}
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
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
              <select
                value={prospectData.pipeline_stage}
                onChange={(e) => setProspectData({...prospectData, pipeline_stage: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="Novo Lead">Novo Lead</option>
                <option value="Contato Realizado">Contato Realizado</option>
                <option value="Reunião Agendada">Reunião Agendada</option>
                <option value="Proposta Enviada">Proposta Enviada</option>
                <option value="Fechado">Fechado</option>
                <option value="Perdido">Perdido</option>
              </select>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={editingProspect ? updateProspect : addProspect}
                className="flex-1 bg-yellow-400 text-black p-3 rounded-md font-semibold hover:bg-yellow-300 transition-colors"
              >
                {editingProspect ? 'Atualizar' : 'Adicionar'}
              </button>
              <button
                onClick={() => {
                  setShowProspectModal(false)
                  setEditingProspect(null)
                  setProspectData({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    aum_value: '',
                    priority: 'Média',
                    pipeline_stage: 'Novo Lead'
                  })
                }}
                className="flex-1 bg-gray-600 text-white p-3 rounded-md font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Activity */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Nova Atividade</h3>
            
            <div className="space-y-4">
              <select
                value={activityData.prospect_id}
                onChange={(e) => setActivityData({...activityData, prospect_id: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">Selecionar Prospect</option>
                {prospects.map(prospect => (
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
                <option value="call">Ligação</option>
                <option value="email">Email</option>
                <option value="meeting">Reunião</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="visit">Visita</option>
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
                type="datetime-local"
                value={activityData.scheduled_date}
                onChange={(e) => setActivityData({...activityData, scheduled_date: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={addActivity}
                className="flex-1 bg-yellow-400 text-black p-3 rounded-md font-semibold hover:bg-yellow-300 transition-colors"
              >
                Adicionar
              </button>
              <button
                onClick={() => {
                  setShowActivityModal(false)
                  setActivityData({
                    prospect_id: '',
                    type: 'call',
                    title: '',
                    description: '',
                    scheduled_date: ''
                  })
                }}
                className="flex-1 bg-gray-600 text-white p-3 rounded-md font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir este {deleteConfirm.type === 'prospect' ? 'prospect' : 'item'}?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'prospect') {
                    deleteProspect(deleteConfirm.id)
                  }
                }}
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