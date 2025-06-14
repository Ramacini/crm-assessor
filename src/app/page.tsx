'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  aum_value?: number;
  risk_profile?: string;
  status: string;
  pipeline_stage: string;
  created_at?: string;
}

interface Activity {
  id: string;
  client_id: string;
  type: string;
  title: string;
  description?: string;
  completed: boolean;
  scheduled_date?: string;
  completed_date?: string;
  created_at: string;
  clients?: {
    name: string;
    email: string;
  };
}

interface Plan {
  name: string;
  price: number;
  originalPrice: number;
  description: string;
  features: string[];
  annualPrice: number;
  popular?: boolean;
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState('landing')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showDemo, setShowDemo] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Client | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [selectedClientForActivity, setSelectedClientForActivity] = useState<Client | null>(null)
  const [showActivitiesModal, setShowActivitiesModal] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Função para mover cliente no pipeline
  const moveClientInPipeline = async (clientId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ pipeline_stage: newStage })
        .eq('id', clientId)
      
      if (error) {
        alert('Erro ao mover cliente: ' + error.message)
      } else {
        fetchClients() // Recarregar dados
      }
    } catch (err) {
      alert('Erro ao mover cliente: ' + String(err))
    }
  }
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    password: ''
  })

  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    aum_value: '',
    risk_profile: '',
    status: 'Prospect',
    pipeline_stage: 'Prospect'
  })

  const [activityData, setActivityData] = useState({
    type: '',
    title: '',
    description: '',
    scheduled_date: '',
    completed: false
  })

  // Buscar atividades do banco de dados
  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          clients (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Erro ao buscar atividades:', error)
      } else {
        setActivities(data || [])
      }
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  // Buscar clientes do banco de dados
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Erro ao buscar clientes:', error)
      } else {
        setClients(data || [])
        setFilteredClients(data || [])
      }
      }
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  // Filtrar clientes pela busca
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredClients(clients)
    } else {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredClients(filtered)
    }
  }, [searchTerm, clients])

  // Carregar clientes e atividades quando entrar no dashboard
  useEffect(() => {
    if (currentPage === 'dashboard') {
      fetchClients()
      fetchActivities()
    }
  }, [currentPage])

  const handleSignup = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          name: formData.name,
          email: formData.email,
          company: formData.company
        }])
      
      if (error) {
        alert('Erro: ' + error.message)
      } else {
        alert('Cadastro realizado com sucesso!')
        setCurrentPage('dashboard')
      }
    } catch (err) {
      alert('Erro ao cadastrar: ' + String(err))
    }
  }

  const handleClientSubmit = async () => {
    console.log('Tentando inserir/atualizar cliente...', clientData)
    
    try {
      let result
      
      if (editingClient) {
        // Atualizar cliente existente
        result = await supabase
          .from('clients')
          .update({
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            company: clientData.company,
            aum_value: clientData.aum_value ? parseFloat(clientData.aum_value) : null,
            risk_profile: clientData.risk_profile,
            status: clientData.status,
            pipeline_stage: clientData.pipeline_stage
          })
          .eq('id', editingClient.id)
      } else {
        // Criar novo cliente
        result = await supabase
          .from('clients')
          .insert({
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            company: clientData.company,
            aum_value: clientData.aum_value ? parseFloat(clientData.aum_value) : null,
            risk_profile: clientData.risk_profile,
            status: clientData.status,
            pipeline_stage: clientData.pipeline_stage
          })
      }
      
      const { error } = result
      console.log('Resposta:', { error })
      
      if (error) {
        alert('Erro ao salvar cliente: ' + error.message)
      } else {
        alert(editingClient ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!')
        setClientData({
          name: '',
          email: '',
          phone: '',
          company: '',
          aum_value: '',
          risk_profile: '',
          status: 'Prospect',
          pipeline_stage: 'Prospect'
        })
        setShowClientForm(false)
        setEditingClient(null)
        fetchClients()
      }
    } catch (err) {
      console.log('Erro catch:', err)
      alert('Erro ao salvar cliente: ' + String(err))
    }
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setClientData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      aum_value: client.aum_value ? client.aum_value.toString() : '',
      risk_profile: client.risk_profile || '',
      status: client.status || 'Prospect',
      pipeline_stage: client.pipeline_stage || 'Prospect'
    })
    setShowClientForm(true)
  }

  const handleDeleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
      
      if (error) {
        alert('Erro ao deletar cliente: ' + error.message)
      } else {
        alert('Cliente deletado com sucesso!')
        setShowDeleteConfirm(null)
        fetchClients()
      }
    } catch (err) {
      alert('Erro ao deletar cliente: ' + String(err))
    }
  }

  const handleActivitySubmit = async () => {
    if (!selectedClientForActivity) {
      alert('Selecione um cliente!')
      return
    }

    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          client_id: selectedClientForActivity.id,
          type: activityData.type,
          title: activityData.title,
          description: activityData.description,
          scheduled_date: activityData.scheduled_date ? new Date(activityData.scheduled_date).toISOString() : null,
          completed: activityData.completed
        })
      
      if (error) {
        alert('Erro ao criar atividade: ' + error.message)
      } else {
        alert('Atividade criada com sucesso!')
        setActivityData({
          type: '',
          title: '',
          description: '',
          scheduled_date: '',
          completed: false
        })
        setShowActivityForm(false)
        setSelectedClientForActivity(null)
        fetchActivities()
      }
    } catch (err) {
      alert('Erro ao criar atividade: ' + String(err))
    }
  }

  const handleCompleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          completed: true,
          completed_date: new Date().toISOString()
        })
        .eq('id', activityId)
      
      if (error) {
        alert('Erro ao completar atividade: ' + error.message)
      } else {
        fetchActivities()
      }
    } catch (err) {
      alert('Erro ao completar atividade: ' + String(err))
    }
  }

  const resetClientForm = () => {
    setClientData({
      name: '',
      email: '',
      phone: '',
      company: '',
      aum_value: '',
      risk_profile: '',
      status: 'Prospect',
      pipeline_stage: 'Prospect'
    })
    setEditingClient(null)
    setShowClientForm(false)
  }

  const plans: Plan[] = [
    {
      name: 'Starter',
      price: 39.90,
      originalPrice: 79.90,
      description: 'Perfeito para assessores iniciantes',
      features: [
        'Até 100 clientes',
        'Dashboard básico',
        'Gestão de atividades',
        'App mobile',
        '1 usuário'
      ],
      annualPrice: 29.90
    },
    {
      name: 'Professional',
      price: 79.90,
      originalPrice: 159.90,
      description: 'Para assessores em crescimento',
      features: [
        'Até 500 clientes',
        'Dashboard avançado com IA',
        'WhatsApp Business API',
        'Automações inteligentes',
        'Até 3 usuários'
      ],
      annualPrice: 59.90,
      popular: true
    },
    {
      name: 'Enterprise',
      price: 149.90,
      originalPrice: 299.90,
      description: 'Para empresas e grandes assessores',
      features: [
        'Clientes ilimitados',
        'IA para recomendações',
        'White label completo',
        'Suporte 24/7 dedicado',
        'Usuários ilimitados'
      ],
      annualPrice: 99.90
    }
  ]

  return (
    <div className="gradient-bg text-white min-h-screen">
      <style jsx global>{`
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #1f2937 0%, #000000 50%, #374151 100%); }
        .gold-gradient { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
        .gold-text { background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hover-glow:hover { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
        .hidden { display: none; }
      `}</style>

      {/* Landing Page */}
      {currentPage === 'landing' && (
        <div>
          {/* Header */}
          <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-3">
                  <div className="gold-gradient p-2 rounded-lg">
                    <span className="text-black font-bold">📈</span>
                  </div>
                  <span className="text-xl font-bold gold-text">CRM do Assessor</span>
                </div>
                <nav className="hidden md:flex items-center space-x-8">
                  <span className="text-gray-300 hover:text-yellow-400 transition cursor-pointer">Recursos</span>
                  <span className="text-gray-300 hover:text-yellow-400 transition cursor-pointer">Preços</span>
                  <span className="text-gray-300 hover:text-yellow-400 transition cursor-pointer">Depoimentos</span>
                  <button onClick={() => setShowDemo(true)} className="text-gray-300 hover:text-yellow-400 transition">Demo</button>
                </nav>
                <div className="flex items-center space-x-4">
                  <button onClick={() => setCurrentPage('login')} className="text-gray-300 hover:text-yellow-400 transition">Entrar</button>
                  <button onClick={() => setCurrentPage('signup')} className="gold-gradient text-black px-6 py-2 rounded-lg hover-glow transition-all duration-300 font-semibold">Começar Agora</button>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-yellow-600/10"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center bg-yellow-400/10 text-yellow-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-yellow-400/20">
                  <span className="mr-2">⚡</span>
                  OFERTA ESPECIAL: 50% OFF + Preço mais baixo do Brasil!
                </div>
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                  O CRM que 
                  <span className="gold-text"> multiplica</span> seus resultados
                  <br/>
                  <span className="text-2xl md:text-3xl text-yellow-400">por apenas R$ 39,90/mês</span>
                </h1>
                <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Transforme sua operação como assessor de investimentos. Gerencie clientes, automatize follow-ups e 
                  <strong className="text-yellow-400"> aumente seu AUM em até 300%</strong> com o CRM mais completo do mercado.
                  <br/>
                  <span className="text-yellow-400 font-semibold">⚡ Oferta especial: 50% OFF apenas até o final do mês!</span>
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <button onClick={() => setCurrentPage('signup')} className="gold-gradient text-black px-8 py-4 rounded-lg text-lg font-semibold hover-glow transition-all duration-300 flex items-center">
                    Começar Agora
                    <span className="ml-2">→</span>
                  </button>
                  <button onClick={() => setShowDemo(true)} className="border-2 border-gray-600 text-gray-300 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 hover:border-yellow-400 hover:text-yellow-400 transition flex items-center">
                    <span className="mr-2">▶</span>
                    Ver Demonstração
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-4">✓ Preço mais baixo do Brasil • ✓ Cancelamento a qualquer momento • ✓ Suporte incluído</p>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-16 bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">8,500+</div>
                  <div className="text-gray-300">Assessores Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">R$ 3.2B+</div>
                  <div className="text-gray-300">AUM Gerenciado</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">300%</div>
                  <div className="text-gray-300">Aumento Médio AUM</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">R$ 39,90</div>
                  <div className="text-gray-300">Preço Mais Baixo do Brasil</div>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section className="py-20 bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">Planos que se adaptam ao seu crescimento</h2>
                <p className="text-xl text-gray-300 mb-6">Escolha o plano ideal para seu perfil e comece a escalar seus resultados hoje mesmo</p>
                
                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 max-w-md mx-auto mb-8">
                  <p className="text-yellow-400 font-semibold mb-2">⏰ Oferta especial termina em:</p>
                  <div className="flex justify-center space-x-4 text-white">
                    <div className="text-center">
                      <div className="bg-yellow-400 text-black w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg">7</div>
                      <p className="text-xs text-gray-300 mt-1">DIAS</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-yellow-400 text-black w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg">23</div>
                      <p className="text-xs text-gray-300 mt-1">HORAS</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-yellow-400 text-black w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg">45</div>
                      <p className="text-xs text-gray-300 mt-1">MIN</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-yellow-400 text-black w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg">12</div>
                      <p className="text-xs text-gray-300 mt-1">SEG</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan, index) => (
                  <div key={index} className={`relative bg-black rounded-2xl shadow-xl border ${plan.popular ? 'ring-2 ring-yellow-400 scale-105 border-yellow-400' : 'border-gray-800'}`}>
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="gold-gradient text-black px-6 py-2 rounded-full text-sm font-medium">
                          Mais Popular
                        </span>
                      </div>
                    )}
                    <div className="p-8">
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-gray-300 mb-6">{plan.description}</p>
                      <div className="mb-6">
                        <div className="flex items-baseline mb-2">
                          <span className="text-4xl font-bold text-yellow-400">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                          <span className="text-gray-400 ml-2">/mês</span>
                        </div>
                        <div className="text-sm text-gray-500 line-through mb-1">
                          De R$ {plan.originalPrice.toFixed(2).replace('.', ',')}
                        </div>
                        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-2 mb-2">
                          <p className="text-yellow-400 text-sm font-medium">
                            💰 Anual: R$ {plan.annualPrice.toFixed(2).replace('.', ',')}/mês
                          </p>
                          <p className="text-xs text-yellow-300">
                            Economize R$ {((plan.price - plan.annualPrice) * 12).toFixed(2).replace('.', ',')} por ano!
                          </p>
                        </div>
                      </div>
                      
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center">
                            <span className="text-yellow-400 mr-3">✓</span>
                            <span className="text-gray-300">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button 
                        onClick={() => {
                          setSelectedPlan(plan);
                          setCurrentPage('signup');
                        }}
                        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                          plan.popular 
                            ? 'gold-gradient text-black hover-glow' 
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                        }`}
                      >
                        Assinar Agora
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-gradient-to-r from-gray-900 to-black">
            <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <span className="bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-bold">⚡ ÚLTIMOS DIAS DA OFERTA ESPECIAL</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-6">Pronto para multiplicar seus resultados?</h2>
              <p className="text-xl text-gray-300 mb-4">Junte-se a mais de 8.500 assessores que já transformaram sua operação</p>
              <p className="text-yellow-400 font-semibold mb-8">50% de desconto • A partir de R$ 39,90/mês • Oferta válida apenas até 31/06</p>
              <button onClick={() => setCurrentPage('signup')} className="gold-gradient text-black px-8 py-4 rounded-lg text-lg font-semibold hover-glow transition-all duration-300">
                Aproveitar Oferta Especial Agora
              </button>
              <p className="text-gray-300 text-sm mt-4">Cobrança imediata • Cancelamento a qualquer momento • Preço mais baixo do Brasil</p>
            </div>
          </section>
        </div>
      )}

      {/* Signup Page */}
      {currentPage === 'signup' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
              <div className="text-center mb-8">
                <div className="gold-gradient p-3 rounded-xl w-fit mx-auto mb-4">
                  <span className="text-black text-2xl">📈</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Criar Conta</h1>
                <p className="text-gray-300">Comece a transformar seus resultados hoje</p>
              </div>

              {selectedPlan && (
                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-yellow-400">Plano {selectedPlan.name}</p>
                      <p className="text-sm text-yellow-300">R$ {selectedPlan.price.toFixed(2).replace('.', ',')}/mês • Cancele quando quiser</p>
                    </div>
                    <button 
                      onClick={() => setSelectedPlan(null)}
                      className="text-yellow-400 hover:text-yellow-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" 
                    placeholder="Seu nome completo" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" 
                    placeholder="seu@email.com" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" 
                    placeholder="(11) 99999-9999" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Empresa</label>
                  <input 
                    type="text" 
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" 
                    placeholder="Nome da sua empresa" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                  <input 
                    type="password" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" 
                    placeholder="Mínimo 6 caracteres" 
                  />
                </div>

                <button onClick={handleSignup} className="w-full gold-gradient text-black py-3 rounded-lg font-semibold hover-glow transition-all duration-300">
                  Assinar Agora
                </button>
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-300">
                  Já tem uma conta? 
                  <button onClick={() => setCurrentPage('login')} className="text-yellow-400 hover:underline ml-1">Fazer login</button>
                </p>
              </div>
            </div>

            <div className="text-center mt-6">
              <button onClick={() => setCurrentPage('landing')} className="text-gray-400 hover:text-gray-300 flex items-center mx-auto">
                ← Voltar para página inicial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Page */}
      {currentPage === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
              <div className="text-center mb-8">
                <div className="gold-gradient p-3 rounded-xl w-fit mx-auto mb-4">
                  <span className="text-black text-2xl">📈</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta</h1>
                <p className="text-gray-300">Faça login na sua conta</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input type="email" className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" placeholder="seu@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                  <input type="password" className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" placeholder="Sua senha" />
                </div>

                <button onClick={() => setCurrentPage('dashboard')} className="w-full gold-gradient text-black py-3 rounded-lg font-semibold hover-glow transition-all duration-300">
                  Entrar
                </button>
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-300">
                  Não tem uma conta? 
                  <button onClick={() => setCurrentPage('signup')} className="text-yellow-400 hover:underline ml-1">Criar conta</button>
                </p>
              </div>
            </div>

            <div className="text-center mt-6">
              <button onClick={() => setCurrentPage('landing')} className="text-gray-400 hover:text-gray-300 flex items-center mx-auto">
                ← Voltar para página inicial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {currentPage === 'dashboard' && (
        <div className="min-h-screen bg-black">
          <header className="bg-gray-900 shadow-lg border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">📈</span>
                  <h1 className="text-xl font-bold text-white">CRM do Assessor</h1>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setShowClientForm(true)}
                    className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold hover-glow transition-all duration-300"
                  >
                    + Novo Cliente
                  </button>
                  <button className="p-2 text-gray-400 hover:text-yellow-400">🔔</button>
                  <div className="h-8 w-8 gold-gradient rounded-full flex items-center justify-center">
                    <span className="text-black text-sm">👤</span>
                  </div>
                  <button onClick={() => setCurrentPage('landing')} className="text-gray-400 hover:text-yellow-400 text-sm">Sair</button>
                </div>
              </div>
            </div>
          </header>

          <div className="p-6">
            {/* Navegação por Abas */}
            <div className="mb-6">
              <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-yellow-400 text-yellow-400'
                        : 'border-transparent text-gray-300 hover:text-gray-200'
                    }`}
                  >
                    📊 Visão Geral
                  </button>
                  <button
                    onClick={() => setActiveTab('pipeline')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'pipeline'
                        ? 'border-yellow-400 text-yellow-400'
                        : 'border-transparent text-gray-300 hover:text-gray-200'
                    }`}
                  >
                    🏢 Pipeline
                  </button>
                  <button
                    onClick={() => setActiveTab('clients')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'clients'
                        ? 'border-yellow-400 text-yellow-400'
                        : 'border-transparent text-gray-300 hover:text-gray-200'
                    }`}
                  >
                    👥 Clientes
                  </button>
                  <button
                    onClick={() => setActiveTab('activities')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'activities'
                        ? 'border-yellow-400 text-yellow-400'
                        : 'border-transparent text-gray-300 hover:text-gray-200'
                    }`}
                  >
                    📋 Atividades
                  </button>
                </nav>
              </div>
            </div>

            <div className="space-y-6">
            <div className="space-y-6">
              {/* Conteúdo da Aba Visão Geral */}
              {activeTab === 'overview' && (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Total de Clientes</p>
                          <p className="text-2xl font-bold text-white">{clients.length}</p>
                        </div>
                        <span className="text-yellow-400 text-2xl">👥</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Atividades Pendentes</p>
                          <p className="text-2xl font-bold text-white">{activities.filter(a => !a.completed).length}</p>
                        </div>
                        <span className="text-yellow-400 text-2xl">📋</span>
                      </div>
                    </div>

                    <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">AUM Total</p>
                          <p className="text-2xl font-bold text-white">
                            R$ {clients.reduce((sum, c) => sum + (c.aum_value || 0), 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <span className="text-yellow-400 text-2xl">💰</span>
                      </div>
                    </div>

                    <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Taxa Conversão</p>
                          <p className="text-2xl font-bold text-white">
                            {clients.length > 0 ? Math.round((clients.filter(c => c.status === 'Cliente').length / clients.length) * 100) : 0}%
                          </p>
                        </div>
                        <span className="text-yellow-400 text-2xl">📈</span>
                      </div>
                    </div>
                  </div>

                  {/* Atividades Recentes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800">
                      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Atividades Pendentes</h3>
                        <button 
                          onClick={() => setShowActivityForm(true)}
                          className="text-yellow-400 hover:text-yellow-300 text-sm"
                        >
                          + Nova Atividade
                        </button>
                      </div>
                      <div className="p-6">
                        {activities.filter(a => !a.completed).length === 0 ? (
                          <p className="text-center text-gray-400">Nenhuma atividade pendente</p>
                        ) : (
                          <div className="space-y-4">
                            {activities.filter(a => !a.completed).slice(0, 5).map((activity, index) => (
                              <div key={index} className="bg-gray-800 p-4 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-medium text-white">{activity.title}</p>
                                    <p className="text-sm text-gray-400">{activity.type}</p>
                                    {activity.clients && (
                                      <p className="text-xs text-yellow-400">{activity.clients.name}</p>
                                    )}
                                    {activity.scheduled_date && (
                                      <p className="text-xs text-gray-500">
                                        📅 {new Date(activity.scheduled_date).toLocaleDateString('pt-BR')}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleCompleteActivity(activity.id)}
                                    className="text-green-400 hover:text-green-300 text-sm px-2 py-1 rounded border border-green-400/30 hover:bg-green-400/10"
                                  >
                                    ✓ Concluir
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800">
                      <div className="p-6 border-b border-gray-800">
                        <h3 className="text-lg font-semibold text-white">Clientes Recentes</h3>
                      </div>
                      <div className="p-6">
                        {clients.length === 0 ? (
                          <p className="text-center text-gray-400">Nenhum cliente cadastrado</p>
                        ) : (
                          <div className="space-y-4">
                            {clients.slice(0, 5).map((client, index) => (
                              <div key={index} className="bg-gray-800 p-4 rounded-lg">
                                <p className="font-medium text-white">{client.name}</p>
                                <p className="text-sm text-gray-400">{client.email}</p>
                                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                                  client.status === 'Cliente' 
                                    ? 'bg-yellow-400/20 text-yellow-400'
                                    : 'bg-gray-700 text-gray-300'
                                }`}>
                                  {client.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Conteúdo da Aba Pipeline */}
              {activeTab === 'pipeline' && (
                <>
                  {/* Métricas do Pipeline */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Prospects</p>
                          <p className="text-2xl font-bold text-white">
                            {clients.filter(c => c.pipeline_stage === 'Prospect').length}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            R$ {clients.filter(c => c.pipeline_stage === 'Prospect').reduce((sum, c) => sum + (c.aum_value || 0), 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <span className="text-blue-400 text-2xl">🎯</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Qualificação</p>
                          <p className="text-2xl font-bold text-white">
                            {clients.filter(c => c.pipeline_stage === 'Qualificação').length}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            R$ {clients.filter(c => c.pipeline_stage === 'Qualificação').reduce((sum, c) => sum + (c.aum_value || 0), 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <span className="text-yellow-400 text-2xl">🔍</span>
                      </div>
                    </div>

                    <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Proposta</p>
                          <p className="text-2xl font-bold text-white">
                            {clients.filter(c => c.pipeline_stage === 'Proposta').length}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            R$ {clients.filter(c => c.pipeline_stage === 'Proposta').reduce((sum, c) => sum + (c.aum_value || 0), 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <span className="text-orange-400 text-2xl">💼</span>
                      </div>
                    </div>

                    <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Fechado</p>
                          <p className="text-2xl font-bold text-white">
                            {clients.filter(c => c.pipeline_stage === 'Fechado').length}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            R$ {clients.filter(c => c.pipeline_stage === 'Fechado').reduce((sum, c) => sum + (c.aum_value || 0), 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <span className="text-green-400 text-2xl">✅</span>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Visual - Kanban */}
                  <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-white">Pipeline de Vendas</h3>
                      <div className="text-sm text-gray-400">
                        Taxa de Conversão: {clients.length > 0 ? Math.round((clients.filter(c => c.pipeline_stage === 'Fechado').length / clients.length) * 100) : 0}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* Coluna Prospect */}
                      <div className="bg-black rounded-lg p-4 border border-blue-400/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-blue-400 flex items-center">
                            <span className="mr-2">🎯</span>
                            Prospect
                          </h4>
                          <span className="text-sm text-gray-400">
                            {clients.filter(c => c.pipeline_stage === 'Prospect').length}
                          </span>
                        </div>
                        <div className="space-y-3 min-h-[300px]">
                          {clients.filter(c => c.pipeline_stage === 'Prospect').map((client, index) => (
                            <div key={index} className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-blue-400/50 transition">
                              <p className="font-medium text-white text-sm">{client.name}</p>
                              <p className="text-xs text-gray-400">{client.email}</p>
                              {client.aum_value && (
                                <p className="text-xs text-blue-400 mt-1">R$ {client.aum_value.toLocaleString('pt-BR')}</p>
                              )}
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-gray-500">{client.risk_profile || 'N/A'}</span>
                                <button
                                  onClick={() => moveClientInPipeline(client.id, 'Qualificação')}
                                  className="text-xs text-blue-400 hover:text-blue-300 border border-blue-400/30 px-2 py-1 rounded hover:bg-blue-400/10"
                                >
                                  → Qualificar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Coluna Qualificação */}
                      <div className="bg-black rounded-lg p-4 border border-yellow-400/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-yellow-400 flex items-center">
                            <span className="mr-2">🔍</span>
                            Qualificação
                          </h4>
                          <span className="text-sm text-gray-400">
                            {clients.filter(c => c.pipeline_stage === 'Qualificação').length}
                          </span>
                        </div>
                        <div className="space-y-3 min-h-[300px]">
                          {clients.filter(c => c.pipeline_stage === 'Qualificação').map((client, index) => (
                            <div key={index} className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-yellow-400/50 transition">
                              <p className="font-medium text-white text-sm">{client.name}</p>
                              <p className="text-xs text-gray-400">{client.email}</p>
                              {client.aum_value && (
                                <p className="text-xs text-yellow-400 mt-1">R$ {client.aum_value.toLocaleString('pt-BR')}</p>
                              )}
                              <div className="flex justify-between items-center mt-2">
                                <button
                                  onClick={() => moveClientInPipeline(client.id, 'Prospect')}
                                  className="text-xs text-gray-400 hover:text-gray-300 border border-gray-400/30 px-2 py-1 rounded hover:bg-gray-400/10"
                                >
                                  ← Voltar
                                </button>
                                <button
                                  onClick={() => moveClientInPipeline(client.id, 'Proposta')}
                                  className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-400/30 px-2 py-1 rounded hover:bg-yellow-400/10"
                                >
                                  → Proposta
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Coluna Proposta */}
                      <div className="bg-black rounded-lg p-4 border border-orange-400/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-orange-400 flex items-center">
                            <span className="mr-2">💼</span>
                            Proposta
                          </h4>
                          <span className="text-sm text-gray-400">
                            {clients.filter(c => c.pipeline_stage === 'Proposta').length}
                          </span>
                        </div>
                        <div className="space-y-3 min-h-[300px]">
                          {clients.filter(c => c.pipeline_stage === 'Proposta').map((client, index) => (
                            <div key={index} className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-orange-400/50 transition">
                              <p className="font-medium text-white text-sm">{client.name}</p>
                              <p className="text-xs text-gray-400">{client.email}</p>
                              {client.aum_value && (
                                <p className="text-xs text-orange-400 mt-1">R$ {client.aum_value.toLocaleString('pt-BR')}</p>
                              )}
                              <div className="flex justify-between items-center mt-2">
                                <button
                                  onClick={() => moveClientInPipeline(client.id, 'Qualificação')}
                                  className="text-xs text-gray-400 hover:text-gray-300 border border-gray-400/30 px-2 py-1 rounded hover:bg-gray-400/10"
                                >
                                  ← Voltar
                                </button>
                                <button
                                  onClick={() => moveClientInPipeline(client.id, 'Fechado')}
                                  className="text-xs text-orange-400 hover:text-orange-300 border border-orange-400/30 px-2 py-1 rounded hover:bg-orange-400/10"
                                >
                                  → Fechar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Coluna Fechado */}
                      <div className="bg-black rounded-lg p-4 border border-green-400/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-green-400 flex items-center">
                            <span className="mr-2">✅</span>
                            Fechado
                          </h4>
                          <span className="text-sm text-gray-400">
                            {clients.filter(c => c.pipeline_stage === 'Fechado').length}
                          </span>
                        </div>
                        <div className="space-y-3 min-h-[300px]">
                          {clients.filter(c => c.pipeline_stage === 'Fechado').map((client, index) => (
                            <div key={index} className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-green-400/50 transition">
                              <p className="font-medium text-white text-sm">{client.name}</p>
                              <p className="text-xs text-gray-400">{client.email}</p>
                              {client.aum_value && (
                                <p className="text-xs text-green-400 mt-1">R$ {client.aum_value.toLocaleString('pt-BR')}</p>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-green-400">🎉 Cliente</span>
                                <button
                                  onClick={() => moveClientInPipeline(client.id, 'Proposta')}
                                  className="text-xs text-gray-400 hover:text-gray-300 border border-gray-400/30 px-2 py-1 rounded hover:bg-gray-400/10"
                                >
                                  ← Reabrir
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Resumo do Pipeline */}
                    <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                      <h4 className="text-white font-medium mb-2">Resumo do Pipeline</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Prospects:</span>
                          <span className="text-white ml-2">{clients.filter(c => c.pipeline_stage === 'Prospect').length}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Taxa Qualificação:</span>
                          <span className="text-white ml-2">
                            {clients.filter(c => c.pipeline_stage === 'Prospect').length > 0 
                              ? Math.round((clients.filter(c => c.pipeline_stage !== 'Prospect').length / clients.length) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Taxa Fechamento:</span>
                          <span className="text-white ml-2">
                            {clients.filter(c => c.pipeline_stage === 'Proposta').length > 0 
                              ? Math.round((clients.filter(c => c.pipeline_stage === 'Fechado').length / clients.filter(c => c.pipeline_stage === 'Proposta' || c.pipeline_stage === 'Fechado').length) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Receita Total:</span>
                          <span className="text-green-400 ml-2 font-semibold">
                            R$ {clients.filter(c => c.pipeline_stage === 'Fechado').reduce((sum, c) => sum + (c.aum_value || 0), 0).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Conteúdo da Aba Clientes */}
              {activeTab === 'clients' && (
                <>
                  {/* Busca e Filtros */}
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Buscar clientes por nome, email ou empresa..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <span className="text-gray-400 text-sm">
                        {filteredClients.length} de {clients.length} clientes
                      </span>
                    </div>
                  </div>

                  {/* Lista de Clientes com CRUD */}
                  <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">Clientes</h3>
                      <button 
                        onClick={() => setShowClientForm(true)}
                        className="text-yellow-400 hover:text-yellow-300 text-sm"
                      >
                        + Adicionar Cliente
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-black">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-gray-400">Cliente</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-400">AUM</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-400">Perfil</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-400">Telefone</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-400">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClients.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">
                                {searchTerm ? 'Nenhum cliente encontrado para a busca.' : 'Nenhum cliente cadastrado ainda.'}
                                <br />
                                {!searchTerm && (
                                  <button 
                                    onClick={() => setShowClientForm(true)}
                                    className="text-yellow-400 hover:underline mt-2"
                                  >
                                    Cadastre seu primeiro cliente!
                                  </button>
                                )}
                              </td>
                            </tr>
                          ) : (
                            filteredClients.map((client, index) => (
                              <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                                <td className="p-4">
                                  <div>
                                    <p className="font-medium text-white">{client.name}</p>
                                    <p className="text-sm text-gray-400">{client.email}</p>
                                    {client.company && <p className="text-xs text-gray-500">{client.company}</p>}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-1 text-xs rounded-full border ${
                                    client.status === 'Cliente' 
                                      ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'
                                      : 'bg-gray-700 text-gray-300 border-gray-600'
                                  }`}>
                                    {client.status}
                                  </span>
                                </td>
                                <td className="p-4 text-sm text-gray-300">
                                  {client.aum_value ? `R$ ${client.aum_value.toLocaleString('pt-BR')}` : '-'}
                                </td>
                                <td className="p-4 text-sm text-gray-300">{client.risk_profile || '-'}</td>
                                <td className="p-4 text-sm text-gray-300">{client.phone || '-'}</td>
                                <td className="p-4">
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        setSelectedClientForActivity(client)
                                        setShowActivityForm(true)
                                      }}
                                      className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 rounded border border-blue-400/30 hover:bg-blue-400/10"
                                    >
                                      📋 Atividade
                                    </button>
                                    <button
                                      onClick={() => setShowActivitiesModal(client)}
                                      className="text-green-400 hover:text-green-300 text-sm px-2 py-1 rounded border border-green-400/30 hover:bg-green-400/10"
                                    >
                                      📊 Histórico
                                    </button>
                                    <button
                                      onClick={() => handleEditClient(client)}
                                      className="text-yellow-400 hover:text-yellow-300 text-sm px-2 py-1 rounded border border-yellow-400/30 hover:bg-yellow-400/10"
                                    >
                                      ✏️ Editar
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteConfirm(client)}
                                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded border border-red-400/30 hover:bg-red-400/10"
                                    >
                                      🗑️ Deletar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Conteúdo da Aba Atividades */}
              {activeTab === 'activities' && (
                <>
                  <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">Todas as Atividades</h3>
                      <button 
                        onClick={() => setShowActivityForm(true)}
                        className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold hover-glow transition-all duration-300"
                      >
                        + Nova Atividade
                      </button>
                    </div>
                    <div className="p-6">
                      {activities.length === 0 ? (
                        <p className="text-center text-gray-400">
                          Nenhuma atividade registrada ainda.
                          <br />
                          <button 
                            onClick={() => setShowActivityForm(true)}
                            className="text-yellow-400 hover:underline mt-2"
                          >
                            Registre sua primeira atividade!
                          </button>
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {activities.map((activity, index) => (
                            <div key={index} className={`bg-gray-800 p-4 rounded-lg border-l-4 ${
                              activity.completed ? 'border-green-400' : 'border-yellow-400'
                            }`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      activity.type === 'Ligação' ? 'bg-blue-400/20 text-blue-400' :
                                      activity.type === 'Reunião' ? 'bg-purple-400/20 text-purple-400' :
                                      activity.type === 'Email' ? 'bg-green-400/20 text-green-400' :
                                      'bg-gray-400/20 text-gray-400'
                                    }`}>
                                      {activity.type}
                                    </span>
                                    {activity.completed && (
                                      <span className="px-2 py-1 text-xs rounded-full bg-green-400/20 text-green-400">
                                        ✓ Concluído
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-medium text-white">{activity.title}</p>
                                  {activity.description && (
                                    <p className="text-sm text-gray-400 mt-1">{activity.description}</p>
                                  )}
                                  {activity.clients && (
                                    <p className="text-sm text-yellow-400 mt-1">Cliente: {activity.clients.name}</p>
                                  )}
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                    {activity.scheduled_date && (
                                      <span>📅 Agendado: {new Date(activity.scheduled_date).toLocaleDateString('pt-BR')}</span>
                                    )}
                                    {activity.completed_date && (
                                      <span>✅ Concluído: {new Date(activity.completed_date).toLocaleDateString('pt-BR')}</span>
                                    )}
                                  </div>
                                </div>
                                {!activity.completed && (
                                  <button
                                    onClick={() => handleCompleteActivity(activity.id)}
                                    className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded border border-green-400/30 hover:bg-green-400/10"
                                  >
                                    ✓ Concluir
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro/Edição de Cliente */}
      {showClientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">
                {editingClient ? 'Editar Cliente' : 'Cadastrar Cliente'}
              </h3>
              <button 
                onClick={resetClientForm} 
                className="text-gray-400 hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  value={clientData.name}
                  onChange={(e) => setClientData({...clientData, name: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                  placeholder="Nome do cliente" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input 
                  type="email" 
                  value={clientData.email}
                  onChange={(e) => setClientData({...clientData, email: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                  placeholder="email@cliente.com" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
                <input 
                  type="tel" 
                  value={clientData.phone}
                  onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                  placeholder="(11) 99999-9999" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Empresa</label>
                <input 
                  type="text" 
                  value={clientData.company}
                  onChange={(e) => setClientData({...clientData, company: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                  placeholder="Empresa do cliente" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Valor AUM (R$)</label>
                <input 
                  type="number" 
                  value={clientData.aum_value}
                  onChange={(e) => setClientData({...clientData, aum_value: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                  placeholder="150000" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Perfil de Risco</label>
                <select 
                  value={clientData.risk_profile}
                  onChange={(e) => setClientData({...clientData, risk_profile: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Selecione o perfil</option>
                  <option value="Conservador">Conservador</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Arrojado">Arrojado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select 
                  value={clientData.status}
                  onChange={(e) => setClientData({...clientData, status: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="Prospect">Prospect</option>
                  <option value="Cliente">Cliente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Etapa do Pipeline</label>
                <select 
                  value={clientData.pipeline_stage}
                  onChange={(e) => setClientData({...clientData, pipeline_stage: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="Prospect">🎯 Prospect</option>
                  <option value="Qualificação">🔍 Qualificação</option>
                  <option value="Proposta">💼 Proposta</option>
                  <option value="Fechado">✅ Fechado</option>
                </select>
              </div>

              <button 
                onClick={handleClientSubmit}
                className="w-full gold-gradient text-black py-3 rounded-lg font-semibold hover-glow transition-all duration-300"
              >
                {editingClient ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Atividade */}
      {showActivityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">
                {selectedClientForActivity ? `Nova Atividade - ${selectedClientForActivity.name}` : 'Nova Atividade'}
              </h3>
              <button 
                onClick={() => {
                  setShowActivityForm(false)
                  setSelectedClientForActivity(null)
                  setActivityData({
                    type: '',
                    title: '',
                    description: '',
                    scheduled_date: '',
                    completed: false
                  })
                }} 
                className="text-gray-400 hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!selectedClientForActivity && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Cliente *</label>
                  <select 
                    value={selectedClientForActivity?.id || ''}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value)
                      setSelectedClientForActivity(client || null)
                    }}
                    className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Atividade *</label>
                <select 
                  value={activityData.type}
                  onChange={(e) => setActivityData({...activityData, type: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="Ligação">📞 Ligação</option>
                  <option value="Reunião">🤝 Reunião</option>
                  <option value="Email">📧 Email</option>
                  <option value="WhatsApp">💬 WhatsApp</option>
                  <option value="Follow-up">📋 Follow-up</option>
                  <option value="Proposta">💼 Proposta</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Título *</label>
                <input 
                  type="text" 
                  value={activityData.title}
                  onChange={(e) => setActivityData({...activityData, title: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                  placeholder="Ex: Ligação para apresentar produtos" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                <textarea 
                  value={activityData.description}
                  onChange={(e) => setActivityData({...activityData, description: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 h-24 resize-none" 
                  placeholder="Detalhes da atividade..." 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Data Agendada</label>
                <input 
                  type="datetime-local" 
                  value={activityData.scheduled_date}
                  onChange={(e) => setActivityData({...activityData, scheduled_date: e.target.value})}
                  className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                />
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="completed"
                  checked={activityData.completed}
                  onChange={(e) => setActivityData({...activityData, completed: e.target.checked})}
                  className="mr-2 rounded"
                />
                <label htmlFor="completed" className="text-sm text-gray-300">Marcar como concluída</label>
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

      {/* Modal de Histórico de Atividades */}
      {showActivitiesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl h-5/6 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Histórico de Atividades - {showActivitiesModal.name}</h3>
              <button 
                onClick={() => setShowActivitiesModal(null)} 
                className="text-gray-400 hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {activities.filter(a => a.client_id === showActivitiesModal.id).length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p className="mb-4">Nenhuma atividade registrada para este cliente.</p>
                  <button 
                    onClick={() => {
                      setShowActivitiesModal(null)
                      setSelectedClientForActivity(showActivitiesModal)
                      setShowActivityForm(true)
                    }}
                    className="gold-gradient text-black px-4 py-2 rounded-lg font-semibold hover-glow transition-all duration-300"
                  >
                    + Registrar Primeira Atividade
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities
                    .filter(a => a.client_id === showActivitiesModal.id)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((activity, index) => (
                    <div key={index} className={`bg-gray-800 p-4 rounded-lg border-l-4 ${
                      activity.completed ? 'border-green-400' : 'border-yellow-400'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              activity.type === 'Ligação' ? 'bg-blue-400/20 text-blue-400' :
                              activity.type === 'Reunião' ? 'bg-purple-400/20 text-purple-400' :
                              activity.type === 'Email' ? 'bg-green-400/20 text-green-400' :
                              activity.type === 'WhatsApp' ? 'bg-green-600/20 text-green-600' :
                              'bg-gray-400/20 text-gray-400'
                            }`}>
                              {activity.type}
                            </span>
                            {activity.completed && (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-400/20 text-green-400">
                                ✓ Concluído
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-white">{activity.title}</p>
                          {activity.description && (
                            <p className="text-sm text-gray-400 mt-1">{activity.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>📅 Criado: {new Date(activity.created_at).toLocaleDateString('pt-BR')}</span>
                            {activity.scheduled_date && (
                              <span>⏰ Agendado: {new Date(activity.scheduled_date).toLocaleDateString('pt-BR')}</span>
                            )}
                            {activity.completed_date && (
                              <span>✅ Concluído: {new Date(activity.completed_date).toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                        </div>
                        {!activity.completed && (
                          <button
                            onClick={() => handleCompleteActivity(activity.id)}
                            className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded border border-green-400/30 hover:bg-green-400/10"
                          >
                            ✓ Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-800">
              <button 
                onClick={() => {
                  const currentClient = showActivitiesModal
                  setShowActivitiesModal(null)
                  setSelectedClientForActivity(currentClient)
                  setShowActivityForm(true)
                }}
                className="w-full gold-gradient text-black py-2 rounded-lg font-semibold hover-glow transition-all duration-300"
              >
                + Nova Atividade para {showActivitiesModal.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-300 mb-6">
              Tem certeza que deseja deletar o cliente <strong>{showDeleteConfirm.name}</strong>?
              <br />
              <span className="text-red-400 text-sm">Esta ação não pode ser desfeita.</span>
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteClient(showDeleteConfirm.id)}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Demonstração - CRM do Assessor</h3>
              <button onClick={() => setShowDemo(false)} className="text-gray-400 hover:text-gray-300 text-2xl">×</button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-black">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">🚀 Demonstração Completa do CRM</h2>
                <p className="text-gray-300 text-lg">Veja como o CRM do Assessor vai transformar sua operação!</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">📊 Dashboard Inteligente</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• KPIs em tempo real do seu AUM</li>
                    <li>• Gráficos de performance da carteira</li>
                    <li>• Alertas de oportunidades automáticos</li>
                    <li>• Ranking de top clientes</li>
                  </ul>
                </div>
                
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">👥 Gestão de Clientes</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Perfil de risco completo</li>
                    <li>• Histórico de investimentos</li>
                    <li>• Suitability automático</li>
                    <li>• Timeline de interações</li>
                  </ul>
                </div>
                
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">📱 WhatsApp Integrado</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Mensagens automáticas</li>
                    <li>• Templates pré-aprovados</li>
                    <li>• Campanhas segmentadas</li>
                    <li>• Follow-ups programados</li>
                  </ul>
                </div>
                
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">🤖 IA para Vendas</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Recomendações inteligentes</li>
                    <li>• Análise de comportamento</li>
                    <li>• Previsão de churn</li>
                    <li>• Score de propensão</li>
                  </ul>
                </div>
              </div>
              
              <div className="text-center mt-8">
                <button onClick={() => {setShowDemo(false); setCurrentPage('signup');}} className="gold-gradient text-black px-8 py-4 rounded-lg text-lg font-semibold hover-glow transition-all duration-300">
                  Quero Começar Agora!
                </button>
                <p className="text-gray-400 text-sm mt-4">Mais de 8.500 assessores já transformaram seus resultados!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}