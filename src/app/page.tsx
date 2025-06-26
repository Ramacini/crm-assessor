'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Prospect {
  id: string
  user_id: string
  manager_id?: string
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
  manager_id?: string
  prospect_id: string
  type: string
  title: string
  description?: string
  completed: boolean
  scheduled_date?: string
  completed_date?: string
  created_at: string
}

interface TeamMember {
  id: string
  user_id: string
  name: string
  email: string
  phone?: string
  role: 'assessor' | 'gestor'
  manager_id?: string
  prospects_count: number
  activities_count: number
  conversions: number
  aum_total: number
  score: number
  created_at: string
}

interface UserProfile {
  id: string
  user_id: string
  name: string
  email: string
  phone?: string
  company: string
  role: 'assessor' | 'gestor'
  manager_id?: string
  created_at: string
}

export default function CRMTeamManagement() {
  // Auth states
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('landing')

  // Data states
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // UI states
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddAssessorModal, setShowAddAssessorModal] = useState(false)

  // Form states
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    company: '',
    role: 'assessor' as 'assessor' | 'gestor'
  })

  const [newAssessor, setNewAssessor] = useState({
    name: '',
    email: '',
    phone: '',
    company: userProfile?.company || ''
  })

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await loadUserProfile(user.id)
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', error)
        return
      }

      if (data) {
        setUserProfile(data)
        if (data.role === 'gestor') {
          await loadTeamData(userId)
        } else {
          await loadPersonalData(userId)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    }
  }

  const loadTeamData = async (managerId: string) => {
    try {
      // Carregar prospects da equipe
      const { data: teamProspects, error: prospectsError } = await supabase
        .from('prospects')
        .select('*')
        .eq('manager_id', managerId)
        .order('created_at', { ascending: false })

      if (prospectsError) throw prospectsError
      setProspects(teamProspects || [])

      // Carregar atividades da equipe
      const { data: teamActivities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('manager_id', managerId)
        .order('created_at', { ascending: false })

      if (activitiesError) throw activitiesError
      setActivities(teamActivities || [])

      // Carregar membros da equipe
      const { data: members, error: membersError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('manager_id', managerId)
        .order('created_at', { ascending: false })

      if (membersError) throw membersError

      // Calcular métricas para cada membro
      const membersWithMetrics = await Promise.all(
        (members || []).map(async (member) => {
          const memberProspects = teamProspects?.filter(p => p.user_id === member.user_id) || []
          const memberActivities = teamActivities?.filter(a => a.user_id === member.user_id) || []
          
          const conversions = memberProspects.filter(p => 
            p.pipeline_stage === 'Proposta Enviada' || 
            p.pipeline_stage === 'Fechado'
          ).length

          const aumTotal = memberProspects.reduce((sum, p) => sum + (p.aum_value || 0), 0)
          
          return {
            ...member,
            prospects_count: memberProspects.length,
            activities_count: memberActivities.length,
            conversions,
            aum_total: aumTotal,
            score: (conversions * 10) + (memberProspects.length * 2) + (memberActivities.length * 1)
          }
        })
      )

      setTeamMembers(membersWithMetrics)

    } catch (error) {
      console.error('Erro ao carregar dados da equipe:', error)
    }
  }

  const loadPersonalData = async (userId: string) => {
    try {
      // Carregar prospects pessoais
      const { data: userProspects, error: prospectsError } = await supabase
        .from('prospects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (prospectsError) throw prospectsError
      setProspects(userProspects || [])

      // Carregar atividades pessoais
      const { data: userActivities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (activitiesError) throw activitiesError
      setActivities(userActivities || [])

    } catch (error) {
      console.error('Erro ao carregar dados pessoais:', error)
    }
  }

  const signUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
      })

      if (error) throw error

      if (data.user) {
        // Criar perfil do usuário
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            user_id: data.user.id,
            name: authData.name,
            email: authData.email,
            phone: authData.phone,
            company: authData.company,
            role: authData.role,
            manager_id: authData.role === 'assessor' ? null : null // Será definido depois
          }])

        if (profileError) throw profileError

        alert('Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.')
        setCurrentPage('login')
      }
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
        await loadUserProfile(data.user.id)
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
      setUserProfile(null)
      setProspects([])
      setActivities([])
      setTeamMembers([])
      setCurrentPage('landing')
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  }

  const addAssessor = async () => {
    if (!user || !userProfile || userProfile.role !== 'gestor') return

    try {
      // Criar conta do assessor
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newAssessor.email,
        password: 'tempPassword123', // Senha temporária
        email_confirm: true
      })

      if (authError) throw authError

      if (authData.user) {
        // Criar perfil do assessor
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            user_id: authData.user.id,
            name: newAssessor.name,
            email: newAssessor.email,
            phone: newAssessor.phone,
            company: newAssessor.company,
            role: 'assessor',
            manager_id: user.id
          }])

        if (profileError) throw profileError

        alert('Assessor adicionado com sucesso! Senha temporária: tempPassword123')
        setShowAddAssessorModal(false)
        setNewAssessor({ name: '', email: '', phone: '', company: userProfile.company })
        await loadTeamData(user.id)
      }
    } catch (error) {
      console.error('Erro ao adicionar assessor:', error)
      alert('Erro ao adicionar assessor: ' + (error as Error).message)
    }
  }

  const removeAssessor = async (assessorId: string) => {
    if (!user || !userProfile || userProfile.role !== 'gestor') return

    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', assessorId)

      if (error) throw error

      alert('Assessor removido com sucesso!')
      await loadTeamData(user.id)
    } catch (error) {
      console.error('Erro ao remover assessor:', error)
      alert('Erro ao remover assessor: ' + (error as Error).message)
    }
  }

  const filteredTeamMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              CRM do <span className="text-yellow-400">Gestor</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Sistema completo para gestores acompanharem a performance de suas equipes de assessores de investimento
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
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">Gestão de Equipes</h3>
              <p className="text-gray-300">Acompanhe a performance de todos os assessores da sua equipe em tempo real</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">Rankings Internos</h3>
              <p className="text-gray-300">Compare o desempenho dos assessores e identifique top performers</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">Métricas Avançadas</h3>
              <p className="text-gray-300">Analise conversões, AUM total e atividades por assessor</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-8">Planos</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-gray-900 p-8 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4">Assessor</h3>
                <p className="text-4xl font-bold text-yellow-400 mb-4">R$ 47/mês</p>
                <ul className="text-left space-y-2 mb-6">
                  <li>✓ Gestão de prospects</li>
                  <li>✓ Pipeline personalizado</li>
                  <li>✓ Sistema de atividades</li>
                  <li>✓ Relatórios básicos</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black p-8 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4">Gestor</h3>
                <p className="text-4xl font-bold mb-4">R$ 197/mês</p>
                <ul className="text-left space-y-2 mb-6">
                  <li>✓ Tudo do plano Assessor</li>
                  <li>✓ Gestão de equipes</li>
                  <li>✓ Rankings internos</li>
                  <li>✓ Métricas avançadas</li>
                  <li>✓ Relatórios executivos</li>
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
            <select
              value={authData.role}
              onChange={(e) => setAuthData({...authData, role: e.target.value as 'assessor' | 'gestor'})}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="assessor">Assessor de Investimentos</option>
              <option value="gestor">Gestor de Equipe</option>
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
              type="text"
              placeholder="Telefone"
              value={authData.phone}
              onChange={(e) => setAuthData({...authData, phone: e.target.value})}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
            <input
              type="text"
              placeholder="Empresa (ex: Esparta Investimentos)"
              value={authData.company}
              onChange={(e) => setAuthData({...authData, company: e.target.value})}
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
            CRM do {userProfile?.role === 'gestor' ? 'Gestor' : 'Assessor'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">
              {userProfile?.name} ({userProfile?.company})
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
            {userProfile?.role === 'gestor' && (
              <>
                <button
                  onClick={() => setActiveTab('team')}
                  className={`py-4 px-2 border-b-2 transition-colors ${
                    activeTab === 'team'
                      ? 'border-yellow-400 text-yellow-400'
                      : 'border-transparent text-gray-300 hover:text-white'
                  }`}
                >
                  Minha Equipe
                </button>
                <button
                  onClick={() => setActiveTab('ranking')}
                  className={`py-4 px-2 border-b-2 transition-colors ${
                    activeTab === 'ranking'
                      ? 'border-yellow-400 text-yellow-400'
                      : 'border-transparent text-gray-300 hover:text-white'
                  }`}
                >
                  Ranking
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-3xl font-bold mb-8">
              {userProfile?.role === 'gestor' ? 'Dashboard da Equipe' : 'Dashboard Pessoal'}
            </h2>
            
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
              {userProfile?.role === 'gestor' && (
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Assessores</h3>
                  <p className="text-3xl font-bold text-purple-400">{teamMembers.length}</p>
                </div>
              )}
            </div>

            {/* AUM Total */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-semibold mb-4">AUM Total</h3>
              <p className="text-4xl font-bold text-yellow-400">
                R$ {prospects.reduce((sum, p) => sum + (p.aum_value || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Team Tab (apenas para gestores) */}
        {activeTab === 'team' && userProfile?.role === 'gestor' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Minha Equipe</h2>
              <button
                onClick={() => setShowAddAssessorModal(true)}
                className="bg-yellow-400 text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
              >
                + Adicionar Assessor
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Buscar assessor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white"
              />
            </div>

            {/* Team Members */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeamMembers.map((member) => (
                <div key={member.id} className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{member.name}</h3>
                      <p className="text-gray-400">{member.email}</p>
                    </div>
                    <button
                      onClick={() => removeAssessor(member.user_id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remover
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Prospects:</span>
                      <span className="font-semibold">{member.prospects_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Atividades:</span>
                      <span className="font-semibold">{member.activities_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Conversões:</span>
                      <span className="font-semibold text-green-400">{member.conversions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">AUM Total:</span>
                      <span className="font-semibold text-yellow-400">
                        R$ {member.aum_total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-700">
                      <span className="text-gray-400">Score:</span>
                      <span className="font-bold text-yellow-400">{member.score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ranking Tab (apenas para gestores) */}
        {activeTab === 'ranking' && userProfile?.role === 'gestor' && (
          <div>
            <h2 className="text-3xl font-bold mb-8">Ranking da Equipe</h2>
            
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Posição
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Assessor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Prospects
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Conversões
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        AUM Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {teamMembers
                      .sort((a, b) => b.score - a.score)
                      .map((member, index) => (
                        <tr key={member.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className={`
                                inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                                ${index === 0 ? 'bg-yellow-400 text-black' : 
                                  index === 1 ? 'bg-gray-400 text-black' : 
                                  index === 2 ? 'bg-yellow-600 text-white' : 
                                  'bg-gray-600 text-white'}
                              `}>
                                {index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">{member.name}</div>
                              <div className="text-sm text-gray-400">{member.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {member.prospects_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                            {member.conversions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">
                            R$ {member.aum_total.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-bold text-yellow-400">
                              {member.score}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Adicionar Assessor */}
      {showAddAssessorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Adicionar Assessor</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome completo"
                value={newAssessor.name}
                onChange={(e) => setNewAssessor({...newAssessor, name: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={newAssessor.email}
                onChange={(e) => setNewAssessor({...newAssessor, email: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <input
                type="text"
                placeholder="Telefone"
                value={newAssessor.phone}
                onChange={(e) => setNewAssessor({...newAssessor, phone: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={addAssessor}
                className="flex-1 bg-yellow-400 text-black p-3 rounded-md font-semibold hover:bg-yellow-300 transition-colors"
              >
                Adicionar
              </button>
              <button
                onClick={() => setShowAddAssessorModal(false)}
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