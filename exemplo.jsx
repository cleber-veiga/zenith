import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  Briefcase, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Target, 
  Layers, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Flag,
  Trash2,
  X,
  GitMerge,
  List,
  Layout,
  Lock,
  User,
  Settings,
  Tag,
  Palette,
  Pencil,
  LayoutDashboard,
  PieChart,
  BarChart2,
  Clock,
  Columns,
  MoreHorizontal,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

// --- Utilitários ---

const generateId = () => Math.random().toString(36).substr(2, 9);

// Cores disponíveis para escolha
const COLOR_PALETTE = [
  { name: 'Cinza', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  { name: 'Azul', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { name: 'Verde', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  { name: 'Amarelo', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  { name: 'Laranja', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { name: 'Vermelho', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  { name: 'Roxo', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { name: 'Rosa', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
];

// Dados iniciais de configuração
const INITIAL_CONFIG = {
  sectors: [
    { id: 'sec-1', name: 'Desenvolvimento', color: 'bg-blue-100 text-blue-700' },
    { id: 'sec-2', name: 'Design', color: 'bg-pink-100 text-pink-700' },
    { id: 'sec-3', name: 'Marketing', color: 'bg-purple-100 text-purple-700' }
  ],
  assignees: [
    { id: 'usr-1', name: 'Ana Silva' },
    { id: 'usr-2', name: 'Carlos Souza' },
    { id: 'usr-3', name: 'Diretoria' }
  ],
  priorities: [
    { id: 'low', name: 'Baixa', color: 'bg-slate-200 text-slate-700' },
    { id: 'medium', name: 'Média', color: 'bg-blue-100 text-blue-700' },
    { id: 'high', name: 'Alta', color: 'bg-orange-100 text-orange-700' },
    { id: 'urgent', name: 'Urgente', color: 'bg-red-100 text-red-700' }
  ],
  statuses: [
    { id: 'todo', name: 'A Fazer', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    { id: 'progress', name: 'Em Progresso', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'review', name: 'Revisão', color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { id: 'done', name: 'Concluído', color: 'bg-green-50 text-green-600 border-green-200' }
  ]
};

// --- Componentes UI Básicos ---

const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', active = false, ...props }) => {
  const bases = "flex items-center justify-center rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: active 
      ? "bg-indigo-800 text-white shadow-inner ring-2 ring-indigo-500" 
      : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: active
      ? "bg-gray-200 text-gray-900 border-gray-400 shadow-inner"
      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-400",
    ghost: active
      ? "bg-gray-200 text-gray-900"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-400",
  };
  
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
    icon: "p-1.5"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${bases} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const Badge = ({ children, className }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

// --- Componente de Tabela Editável (Notion Style) ---

const TaskTableView = ({ tasks, config, onUpdateTask, onDeleteTask, onAddTask }) => {
  const [newTaskName, setNewTaskName] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && newTaskName.trim()) {
      onAddTask({ name: newTaskName, status: 'todo', priority: 'medium' }); 
      setNewTaskName('');
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50/80">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-500 w-[35%]">Nome</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-500 w-[15%]">Status</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-500 w-[15%]">Prioridade</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-500 w-[15%]">Responsável</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-500 w-[10%]">Setor</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-500 w-[10%]">Prazo</th>
            <th scope="col" className="w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {tasks.map((task) => {
            const statusConfig = config.statuses.find(s => s.id === task.status);
            const priorityConfig = config.priorities.find(p => p.id === task.priority);
            const sectorConfig = config.sectors.find(s => s.id === task.sector);
            const assignee = config.assignees.find(a => a.id === task.assignee);

            return (
              <tr key={task.id} className="group hover:bg-gray-50/80 transition-colors">
                {/* Nome */}
                <td className="px-4 py-2 relative">
                  <input 
                    type="text" 
                    value={task.name} 
                    onChange={(e) => onUpdateTask(task.id, { name: e.target.value })}
                    className="w-full bg-transparent border-none p-1 focus:ring-2 focus:ring-indigo-100 rounded text-gray-900 font-medium placeholder-gray-400"
                  />
                </td>

                {/* Status */}
                <td className="px-4 py-2">
                  <select 
                    value={task.status} 
                    onChange={(e) => onUpdateTask(task.id, { status: e.target.value })}
                    className={`w-full text-xs font-medium rounded-md border-0 py-1 pl-2 pr-8 cursor-pointer focus:ring-2 focus:ring-indigo-100 ${statusConfig?.color || 'bg-gray-100 text-gray-600'}`}
                  >
                    {config.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </td>

                {/* Prioridade */}
                <td className="px-4 py-2">
                   <div className="flex items-center">
                     <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${priorityConfig?.color.split(' ')[0]}`}></div>
                     <select 
                        value={task.priority} 
                        onChange={(e) => onUpdateTask(task.id, { priority: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-xs text-gray-600 focus:ring-0 cursor-pointer"
                      >
                        {config.priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                   </div>
                </td>

                {/* Responsável */}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                     {assignee ? (
                       <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                         {assignee.name.charAt(0)}
                       </div>
                     ) : <User size={14} className="text-gray-300"/>}
                     <select 
                        value={task.assignee || ''} 
                        onChange={(e) => onUpdateTask(task.id, { assignee: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-xs text-gray-600 focus:ring-0 cursor-pointer truncate"
                      >
                        <option value="">--</option>
                        {config.assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                  </div>
                </td>
                
                {/* Setor */}
                <td className="px-4 py-2">
                  <select 
                    value={task.sector || ''} 
                    onChange={(e) => onUpdateTask(task.id, { sector: e.target.value })}
                    className={`w-full text-xs rounded border-0 py-1 px-2 cursor-pointer focus:ring-1 focus:ring-indigo-100 ${sectorConfig?.color ? `${sectorConfig.color} bg-opacity-20` : 'text-gray-400'}`}
                  >
                    <option value="">Sem setor</option>
                    {config.sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </td>

                {/* Prazo */}
                <td className="px-4 py-2">
                  <input 
                    type="date" 
                    value={task.end || ''} 
                    onChange={(e) => onUpdateTask(task.id, { end: e.target.value })}
                    className="bg-transparent border-none p-0 text-xs text-gray-500 focus:ring-0 w-full"
                  />
                </td>

                {/* Ações */}
                <td className="px-4 py-2 text-right">
                   <button 
                     onClick={() => onDeleteTask(task.id)} 
                     className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <Trash2 size={14} />
                   </button>
                </td>
              </tr>
            );
          })}
          
          {/* Linha de Novo Subitem */}
          <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
            <td colSpan="7" className="px-4 py-2">
              <div 
                className="flex items-center text-gray-400 hover:text-gray-600 cursor-text" 
                onClick={() => document.getElementById('new-task-input')?.focus()}
              >
                <Plus size={16} className="mr-2"/>
                <input 
                   id="new-task-input"
                   value={newTaskName}
                   onChange={(e) => setNewTaskName(e.target.value)}
                   onKeyDown={handleKeyDown}
                   placeholder="Novo subitem" 
                   className="bg-transparent border-none focus:ring-0 w-full placeholder-gray-400 text-sm py-1"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// --- Componente de Visualização Kanban ---

const KanbanView = ({ tasks, config, onStatusChange, onDeleteTask, onEditTask }) => {
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // Agrupa tarefas por status
  const columns = useMemo(() => {
    return config.statuses.map(status => ({
      ...status,
      tasks: tasks.filter(t => t.status === status.id)
    }));
  }, [tasks, config.statuses]);

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("taskId", taskId);
    // Adiciona classe para estilo visual durante drag (opcional)
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, newStatusId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId && newStatusId) {
      onStatusChange(taskId, newStatusId);
    }
    setDraggedTaskId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[400px]">
      {columns.map(col => (
        <div 
          key={col.id} 
          className="flex-shrink-0 w-72 bg-gray-100/80 rounded-lg flex flex-col border border-gray-200"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          {/* Coluna Header */}
          <div className={`p-3 rounded-t-lg border-b border-gray-200/50 flex justify-between items-center ${col.color.split(' ')[0]} bg-opacity-20`}>
            <div className="flex items-center gap-2 font-semibold text-gray-700">
              <span className={`w-2 h-2 rounded-full ${col.color.split(' ')[0]} border border-black/10`}></span>
              {col.name}
            </div>
            <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full text-gray-600 font-medium">
              {col.tasks.length}
            </span>
          </div>

          {/* Coluna Body (Droppable) */}
          <div className="p-2 flex-1 overflow-y-auto space-y-2">
            {col.tasks.map(task => {
              const priorityConfig = config.priorities.find(p => p.id === task.priority) || { color: 'bg-gray-200', name: '-' };
              const assigneeName = config.assignees.find(a => a.id === task.assignee)?.name || 'N/A';
              
              return (
                <div 
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className={`
                    bg-white p-3 rounded shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-all
                    ${draggedTaskId === task.id ? 'opacity-50' : 'opacity-100'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                     <span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityConfig.color} bg-opacity-30 border border-black/5`}>
                       {priorityConfig.name}
                     </span>
                     <div className="flex gap-1">
                       <button onClick={() => onEditTask(task)} className="text-gray-300 hover:text-indigo-500"><Pencil size={12} /></button>
                       <button onClick={() => onDeleteTask(task.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                     </div>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">{task.name}</div>
                  
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1" title="Data de Fim">
                      <Clock size={12} />
                      {task.end ? new Date(task.end).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) : '--/--'}
                    </div>
                    
                    {assigneeName !== 'N/A' && (
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[9px] border border-white shadow-sm" title={assigneeName}>
                        {assigneeName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {col.tasks.length === 0 && (
              <div className="h-full min-h-[50px] flex items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded">
                Arraste aqui
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Componente de Calendário (Dashboard) ---

const CalendarView = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`pad-${i}`} className="bg-gray-50/50 h-32 border border-gray-100"></div>);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const dayTasks = tasks.filter(t => {
        if (!t.start && !t.end) return false;
        const start = t.start ? new Date(t.start) : null;
        const end = t.end ? new Date(t.end) : null;
        const current = new Date(dateStr);
        current.setHours(0,0,0,0);
        if(start) start.setHours(0,0,0,0);
        if(end) end.setHours(0,0,0,0);

        if (start && end) return current >= start && current <= end;
        if (start) return current.getTime() === start.getTime();
        if (end) return current.getTime() === end.getTime();
        return false;
      });

      days.push(
        <div key={d} className="bg-white h-32 border border-gray-100 p-1 overflow-hidden hover:bg-gray-50 transition-colors">
          <div className="text-right text-xs font-semibold text-gray-400 mb-1">{d}</div>
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[90px] scrollbar-hide">
            {dayTasks.map(t => (
              <div key={t.id} className={`text-[10px] px-1 py-0.5 rounded truncate border-l-2 ${t.status === 'done' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-indigo-50 border-indigo-500 text-indigo-700'}`} title={t.name}>
                {t.name}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <CalendarIcon size={18} /> Calendário de Alocação
        </h3>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20} className="rotate-180" /></button>
          <span className="font-semibold text-gray-800 w-32 text-center">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center text-xs font-medium text-gray-500 py-2">
        <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
      </div>
      <div className="grid grid-cols-7 bg-gray-200 gap-px border-b border-gray-200">
        {renderDays()}
      </div>
    </div>
  );
};

// --- Componente de Dashboard Analytics ---

const DashboardView = ({ workspaces, config }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(workspaces[0]?.projects[0]?.id || '');
  
  const allProjects = useMemo(() => {
    return workspaces.flatMap(ws => ws.projects.map(pj => ({ ...pj, workspaceName: ws.name })));
  }, [workspaces]);

  const stats = useMemo(() => {
    const project = allProjects.find(p => p.id === selectedProjectId);
    if (!project) return null;

    let macroCount = project.macros.length;
    let microCount = 0;
    let completedCount = 0;
    
    const byStatus = {};
    const bySector = {};
    const byAssignee = {};
    const allMicros = [];

    config.statuses.forEach(s => byStatus[s.id] = 0);
    config.sectors.forEach(s => bySector[s.id] = 0);
    config.assignees.forEach(s => byAssignee[s.id] = 0);

    project.macros.forEach(macro => {
      macro.targets.forEach(target => {
        target.micros.forEach(micro => {
          microCount++;
          allMicros.push(micro);
          if (micro.status === 'done') completedCount++;
          byStatus[micro.status] = (byStatus[micro.status] || 0) + 1;
          if (micro.sector) bySector[micro.sector] = (bySector[micro.sector] || 0) + 1;
          else bySector['unassigned'] = (bySector['unassigned'] || 0) + 1;
          if (micro.assignee) byAssignee[micro.assignee] = (byAssignee[micro.assignee] || 0) + 1;
          else byAssignee['unassigned'] = (byAssignee['unassigned'] || 0) + 1;
        });
      });
    });

    return {
      name: project.name,
      macroCount,
      microCount,
      completionRate: microCount ? Math.round((completedCount / microCount) * 100) : 0,
      byStatus,
      bySector,
      byAssignee,
      allMicros
    };
  }, [selectedProjectId, allProjects, config]);

  if (!stats) return <div className="p-8 text-center text-gray-500">Nenhum projeto disponível para análise.</div>;

  const renderBarChart = (data, configSource) => {
    const maxVal = Math.max(...Object.values(data), 1);
    
    return (
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => {
          if (key === 'unassigned' && value === 0) return null;
          let itemConfig = { name: 'Não atribuído', color: 'bg-gray-300' };
          if (key !== 'unassigned') itemConfig = configSource.find(c => c.id === key) || itemConfig;
          const bgClass = itemConfig.color?.split(' ').find(c => c.startsWith('bg-')) || 'bg-indigo-500';
          const percentage = (value / maxVal) * 100;

          return (
            <div key={key} className="group">
              <div className="flex justify-between text-xs mb-1 text-gray-600">
                <span>{itemConfig.name}</span>
                <span className="font-bold">{value}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-2.5 rounded-full ${bgClass} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="text-indigo-600" /> Painel de Controle
            </h1>
            <p className="text-sm text-gray-500 mt-1">Visão geral avançada e métricas de desempenho.</p>
          </div>
          <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2">
             <span className="text-xs font-bold text-gray-500 px-2 uppercase">Projeto:</span>
             <select 
               value={selectedProjectId} 
               onChange={(e) => setSelectedProjectId(e.target.value)}
               className="border-none bg-transparent text-sm font-medium text-indigo-700 focus:ring-0 cursor-pointer min-w-[200px]"
             >
               {allProjects.map(p => (
                 <option key={p.id} value={p.id}>{p.name} ({p.workspaceName})</option>
               ))}
             </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Layers size={24} /></div>
            <div><p className="text-sm text-gray-500 font-medium">Tarefas Macros</p><h3 className="text-2xl font-bold text-gray-800">{stats.macroCount}</h3></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Target size={24} /></div>
            <div><p className="text-sm text-gray-500 font-medium">Tarefas Micros</p><h3 className="text-2xl font-bold text-gray-800">{stats.microCount}</h3></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stats.completionRate >= 100 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}><PieChart size={24} /></div>
            <div><p className="text-sm text-gray-500 font-medium">Taxa de Conclusão</p><h3 className="text-2xl font-bold text-gray-800">{stats.completionRate}%</h3></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckSquare size={16} className="text-gray-400" /> Por Situação</h3>
             {renderBarChart(stats.byStatus, config.statuses)}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Briefcase size={16} className="text-gray-400" /> Por Setor</h3>
             {renderBarChart(stats.bySector, config.sectors)}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><User size={16} className="text-gray-400" /> Carga da Equipe</h3>
             {renderBarChart(stats.byAssignee, config.assignees)}
          </div>
        </div>
        <CalendarView tasks={stats.allMicros} />
      </div>
    </div>
  );
};

// --- Componente de Fluxograma (Flow View) ---

const FlowView = ({ tasks, onDeleteTask, onUpdateDependency, parentId, config }) => {
  const [connectingMode, setConnectingMode] = useState(false);
  const [sourceNode, setSourceNode] = useState(null);
  
  const layout = useMemo(() => {
    const levels = {};
    tasks.forEach(t => levels[t.id] = 0);
    const pushLevels = (taskId, level) => {
      levels[taskId] = Math.max(levels[taskId] || 0, level);
      const dependents = tasks.filter(t => t.dependencies?.includes(taskId));
      dependents.forEach(dep => { pushLevels(dep.id, level + 1); });
    };
    tasks.filter(t => !t.dependencies || t.dependencies.length === 0).forEach(t => { pushLevels(t.id, 0); });
    const columns = [];
    Object.entries(levels).forEach(([taskId, lvl]) => {
      if (!columns[lvl]) columns[lvl] = [];
      const task = tasks.find(t => t.id === taskId);
      if (task) columns[lvl].push(task);
    });
    return columns;
  }, [tasks]);

  const CARD_WIDTH = 220;
  const CARD_HEIGHT = 100;
  const GAP_X = 80;
  const GAP_Y = 20;

  const renderConnections = () => {
    return tasks.flatMap(task => {
      if (!task.dependencies) return [];
      const targetLvl = layout.findIndex(col => col && col.some(t => t.id === task.id));
      const targetIdx = layout[targetLvl]?.findIndex(t => t.id === task.id);
      if (targetLvl === -1 || targetIdx === -1) return [];
      const targetX = targetLvl * (CARD_WIDTH + GAP_X);
      const targetY = targetIdx * (CARD_HEIGHT + GAP_Y);

      return task.dependencies.map(depId => {
        const sourceLvl = layout.findIndex(col => col && col.some(t => t.id === depId));
        if (sourceLvl === -1) return null;
        const sourceIdx = layout[sourceLvl].findIndex(t => t.id === depId);
        const sourceX = sourceLvl * (CARD_WIDTH + GAP_X);
        const sourceY = sourceIdx * (CARD_HEIGHT + GAP_Y);
        const x1 = sourceX + CARD_WIDTH;
        const y1 = sourceY + CARD_HEIGHT / 2;
        const x2 = targetX;
        const y2 = targetY + CARD_HEIGHT / 2;
        const c1 = x1 + (GAP_X / 2);
        const c2 = x2 - (GAP_X / 2);

        return (
          <g key={`${depId}-${task.id}`}>
             <path d={`M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`} stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
          </g>
        );
      });
    });
  };

  const handleNodeClick = (taskId) => {
    if (!connectingMode) return;
    if (!sourceNode) { setSourceNode(taskId); } 
    else {
      if (sourceNode === taskId) { setSourceNode(null); return; }
      onUpdateDependency(taskId, sourceNode);
      setSourceNode(null);
      setConnectingMode(false);
    }
  };

  const isBlocked = (task) => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some(depId => {
      const dep = tasks.find(t => t.id === depId);
      return dep && dep.status !== 'done'; 
    });
  };

  const canvasHeight = Math.max(...layout.map(col => col ? col.length : 0)) * (CARD_HEIGHT + GAP_Y) + 100;
  const canvasWidth = layout.length * (CARD_WIDTH + GAP_X) + 100;

  return (
    <div className="border border-gray-200 rounded-lg bg-slate-50 overflow-auto relative min-h-[400px]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="absolute top-4 right-4 z-10 bg-white p-2 rounded-lg shadow border border-gray-200 flex gap-2">
        <Button size="sm" variant={connectingMode ? "primary" : "secondary"} onClick={() => { setConnectingMode(!connectingMode); setSourceNode(null); }} active={connectingMode}>
          <GitMerge size={14} className="mr-2" />
          {connectingMode ? (sourceNode ? "Selecione o Destino" : "Selecione a Origem") : "Conectar Tarefas"}
        </Button>
      </div>
      <div className="p-10 min-w-max">
        <svg width={Math.max(canvasWidth, 800)} height={Math.max(canvasHeight, 400)}>
          <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" /></marker></defs>
          {renderConnections()}
          {layout.map((col, colIndex) => (
             col && col.map((task, rowIndex) => {
               const x = colIndex * (CARD_WIDTH + GAP_X);
               const y = rowIndex * (CARD_HEIGHT + GAP_Y);
               const blocked = isBlocked(task);
               const isSource = sourceNode === task.id;
               const statusConfig = config.statuses.find(s => s.id === task.status) || { color: 'bg-gray-100 text-gray-500', name: 'N/A' };
               const assigneeName = config.assignees.find(a => a.id === task.assignee)?.name || 'N/A';
               return (
                 <foreignObject key={task.id} x={x} y={y} width={CARD_WIDTH} height={CARD_HEIGHT}>
                   <div onClick={() => handleNodeClick(task.id)} className={`h-full w-full bg-white rounded-lg p-3 shadow-sm border-2 transition-all cursor-pointer relative ${isSource ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'} ${connectingMode && !isSource ? 'hover:scale-105' : ''} ${blocked ? 'opacity-90 bg-slate-50' : ''}`}>
                     {blocked && (<div className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full border border-red-200 z-10" title="Bloqueado por dependência"><Lock size={12} /></div>)}
                     <div className="flex justify-between items-start mb-2">
                        <div className={`w-3 h-3 rounded-sm border mt-1 ${task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}></div>
                        <Badge className={`${statusConfig.color} text-[10px] px-1 py-0 scale-90 origin-right`}>{statusConfig.name}</Badge>
                     </div>
                     <div className="font-medium text-sm text-gray-800 line-clamp-1 mb-1" title={task.name}>{task.name}</div>
                     <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                       <div className="flex items-center gap-1"><User size={10} /> {assigneeName.split(' ')[0]}</div>
                       {task.dependencies && task.dependencies.length > 0 && (<div className="flex items-center gap-0.5 text-indigo-500 bg-indigo-50 px-1 rounded"><GitMerge size={10} /> {task.dependencies.length}</div>)}
                     </div>
                   </div>
                 </foreignObject>
               );
             })
          ))}
        </svg>
      </div>
    </div>
  );
};

// --- Painel de Configurações ---

const SettingsPanel = ({ config, onUpdateConfig }) => {
  const [activeTab, setActiveTab] = useState('sectors'); 
  const handleAddItem = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const colorIdx = formData.get('color');
    if (!name) return;
    const newItem = { id: generateId(), name: name };
    if (activeTab !== 'assignees') {
        const colorData = COLOR_PALETTE[colorIdx || 0];
        newItem.color = `${colorData.bg} ${colorData.text} ${colorData.border || ''}`;
    }
    const newConfig = { ...config };
    newConfig[activeTab] = [...newConfig[activeTab], newItem];
    onUpdateConfig(newConfig);
    e.target.reset();
  };
  const handleDeleteItem = (id) => {
    if(!confirm("Tem certeza?")) return;
    const newConfig = { ...config };
    newConfig[activeTab] = newConfig[activeTab].filter(item => item.id !== id);
    onUpdateConfig(newConfig);
  };

  const renderList = () => (
    <div className="space-y-2 mt-4">
      {config[activeTab].map(item => (
        <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
           <div className="flex items-center gap-3">
             {activeTab !== 'assignees' && (<div className={`w-4 h-4 rounded-full ${item.color.split(' ')[0]} border border-black/10`}></div>)}
             <span className="text-sm font-medium text-gray-700">{item.name}</span>
           </div>
           <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 border-b border-gray-200 pb-2 mb-4 overflow-x-auto">
        {[{ id: 'sectors', label: 'Setores', icon: Folder }, { id: 'statuses', label: 'Status', icon: CheckSquare }, { id: 'priorities', label: 'Prioridades', icon: Flag }, { id: 'assignees', label: 'Responsáveis', icon: User }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><tab.icon size={14} />{tab.label}</button>
        ))}
      </div>
      <form onSubmit={handleAddItem} className="flex gap-2 mb-2 p-1">
         <input name="name" placeholder={`Novo item...`} className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm outline-none" required />
         {activeTab !== 'assignees' && (<select name="color" className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white">{COLOR_PALETTE.map((c, idx) => (<option key={idx} value={idx}>{c.name}</option>))}</select>)}
         <Button type="submit" size="sm"><Plus size={16} /></Button>
      </form>
      <div className="flex-1 overflow-y-auto">{renderList()}</div>
    </div>
  );
};

// --- Componente Principal ---

export default function ProjectManagementApp() {
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [currentView, setCurrentView] = useState('project'); 
  const [workspaces, setWorkspaces] = useState([
    {
      id: 'ws-1', name: 'Marketing Digital', isOpen: true,
      projects: [{
          id: 'pj-1', name: 'Campanha Q1',
          macros: [{
              id: 'mc-1', name: 'Planejamento Estratégico', isOpen: true,
              targets: [{
                  id: 'tg-1', name: 'Briefing Aprovado', isOpen: true, viewMode: 'list', // 'list', 'flow', 'kanban'
                  micros: [
                    { id: 'mi-1', name: 'Reunião com Stakeholders', description: 'Alinhar expectativas e budget.', start: '2023-10-01', end: '2023-10-05', priority: 'high', status: 'done', assignee: 'usr-1', sector: 'sec-3', dependencies: [] },
                    { id: 'mi-2', name: 'Criar documento de requisitos', description: 'Detalhar personas e canais.', start: '2023-10-06', end: '2023-10-10', priority: 'medium', status: 'progress', assignee: 'usr-2', sector: 'sec-1', dependencies: ['mi-1'] }
                  ]
                }]
            }]
        }]
    }
  ]);

  const [selectedProjectId, setSelectedProjectId] = useState('pj-1');
  const [modalData, setModalData] = useState({ isOpen: false, type: null, parentId: null, data: null, isEditing: false });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const activeWorkspace = workspaces.find(w => w.projects.some(p => p.id === selectedProjectId));
  const activeProject = activeWorkspace?.projects.find(p => p.id === selectedProjectId);

  const toggleWorkspace = (wsId) => setWorkspaces(prev => prev.map(w => w.id === wsId ? { ...w, isOpen: !w.isOpen } : w));
  const selectProject = (pjId) => { setSelectedProjectId(pjId); setCurrentView('project'); };

  // Atualização do Toggle para suportar 3 modos
  const toggleViewMode = (targetId, mode) => {
    const newWorkspaces = structuredClone(workspaces);
    newWorkspaces.forEach(ws => ws.projects.forEach(pj => pj.macros.forEach(mc => mc.targets.forEach(tg => {
      if (tg.id === targetId) {
        // Se passar mode, usa. Senão, cicla: list -> kanban -> flow -> list
        if (mode) {
          tg.viewMode = mode;
        } else {
          if (tg.viewMode === 'list') tg.viewMode = 'kanban';
          else if (tg.viewMode === 'kanban') tg.viewMode = 'flow';
          else tg.viewMode = 'list';
        }
      }
    }))));
    setWorkspaces(newWorkspaces);
  };

  const addDependency = (targetId, taskId, dependencyId) => {
    if (taskId === dependencyId) return;
    const newWorkspaces = structuredClone(workspaces);
    let changed = false;
    newWorkspaces.forEach(ws => ws.projects.forEach(pj => pj.macros.forEach(mc => mc.targets.forEach(tg => {
      if (tg.id === targetId) {
        const task = tg.micros.find(t => t.id === taskId);
        if (task && !task.dependencies?.includes(dependencyId)) {
          if (!task.dependencies) task.dependencies = [];
          task.dependencies.push(dependencyId);
          changed = true;
        }
      }
    }))));
    if (changed) setWorkspaces(newWorkspaces);
  };

  const addItem = (type, parentId, payload) => {
    const newWorkspaces = structuredClone(workspaces);
    if (type === 'workspace') { newWorkspaces.push({ id: generateId(), name: payload.name, isOpen: true, projects: [] }); } 
    else {
      outerLoop:
      for (let ws of newWorkspaces) {
        if (type === 'project' && ws.id === parentId) { ws.projects.push({ id: generateId(), name: payload.name, macros: [] }); break; }
        for (let pj of ws.projects) {
          if (type === 'macro' && pj.id === parentId) { pj.macros.push({ id: generateId(), name: payload.name, isOpen: true, targets: [] }); break outerLoop; }
          for (let mc of pj.macros) {
            if (type === 'target' && mc.id === parentId) { mc.targets.push({ id: generateId(), name: payload.name, isOpen: true, viewMode: 'list', micros: [] }); break outerLoop; }
            for (let tg of mc.targets) {
              if (type === 'micro' && tg.id === parentId) { tg.micros.push({ id: generateId(), dependencies: [], ...payload }); break outerLoop; }
            }
          }
        }
      }
    }
    setWorkspaces(newWorkspaces);
    setModalData({ isOpen: false, type: null, parentId: null, data: null, isEditing: false });
  };

  const updateItem = (type, id, payload) => {
    const newWorkspaces = structuredClone(workspaces);
    newWorkspaces.forEach(ws => {
      if (type === 'workspace' && ws.id === id) Object.assign(ws, payload);
      ws.projects.forEach(pj => {
        if (type === 'project' && pj.id === id) Object.assign(pj, payload);
        pj.macros.forEach(mc => {
          if (type === 'macro' && mc.id === id) Object.assign(mc, payload);
          mc.targets.forEach(tg => {
            if (type === 'target' && tg.id === id) Object.assign(tg, payload);
            tg.micros.forEach(mi => { if (type === 'micro' && mi.id === id) Object.assign(mi, payload); });
          });
        });
      });
    });
    setWorkspaces(newWorkspaces);
    if(modalData.isOpen) setModalData({ isOpen: false, type: null, parentId: null, data: null, isEditing: false });
  };

  const deleteItem = (type, id) => {
    if(!confirm("Tem certeza que deseja excluir este item?")) return;
    let newWorkspaces = structuredClone(workspaces);
    if (type === 'workspace') { newWorkspaces = newWorkspaces.filter(w => w.id !== id); } 
    else if (type === 'project') { newWorkspaces.forEach(ws => { ws.projects = ws.projects.filter(p => p.id !== id); }); if (selectedProjectId === id) setSelectedProjectId(null); } 
    else {
      newWorkspaces.forEach(ws => ws.projects.forEach(pj => {
        if (type === 'macro') pj.macros = pj.macros.filter(m => m.id !== id);
        else pj.macros.forEach(mc => {
          if (type === 'target') mc.targets = mc.targets.filter(t => t.id !== id);
          else mc.targets.forEach(tg => {
             tg.micros = tg.micros.filter(mi => mi.id !== id);
             tg.micros.forEach(t => { if (t.dependencies) t.dependencies = t.dependencies.filter(depId => depId !== id); });
          });
        });
      }));
    }
    setWorkspaces(newWorkspaces);
  };

  const toggleExpand = (type, id) => {
    const newWorkspaces = structuredClone(workspaces);
    newWorkspaces.forEach(ws => ws.projects.forEach(pj => {
      if (type === 'macro') pj.macros.forEach(m => { if(m.id === id) m.isOpen = !m.isOpen; });
      else if (type === 'target') pj.macros.forEach(m => m.targets.forEach(t => { if(t.id === id) t.isOpen = !t.isOpen; }));
    }));
    setWorkspaces(newWorkspaces);
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    if (modalData.isEditing) { updateItem(modalData.type, modalData.data.id, data); } 
    else { addItem(modalData.type, modalData.parentId, data); }
  };

  const renderModalContent = () => {
    if (modalData.type === 'settings') return <SettingsPanel config={config} onUpdateConfig={setConfig} />;
    if (modalData.type === 'micro') {
      const task = modalData.data || {};
      return (
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700">Nome da Tarefa</label><input required name="name" defaultValue={task.name} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2" /></div>
          <div><label className="block text-sm font-medium text-gray-700">Descrição</label><textarea name="description" defaultValue={task.description} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"></textarea></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700">Setor</label><select name="sector" defaultValue={task.sector} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"><option value="">Sem setor</option>{config.sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700">Responsável</label><select name="assignee" defaultValue={task.assignee} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"><option value="">Sem responsável</option>{config.assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700">Início</label><input type="date" name="start" defaultValue={task.start} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Fim</label><input type="date" name="end" defaultValue={task.end} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700">Prioridade</label><select name="priority" defaultValue={task.priority} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">{config.priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700">Status</label><select name="status" defaultValue={task.status} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">{config.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>
          <div className="pt-2 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModalData({...modalData, isOpen: false})}>Cancelar</Button><Button type="submit">{modalData.isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}</Button></div>
        </form>
      );
    }
    const item = modalData.data || {};
    return (
      <form onSubmit={handleModalSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700">Nome</label><input autoFocus required name="name" defaultValue={item.name} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2" placeholder={`Nome...`} /></div>
        <div className="pt-2 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModalData({...modalData, isOpen: false})}>Cancelar</Button><Button type="submit">Salvar</Button></div>
      </form>
    );
  };

  const renderSidebar = () => (
    <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 flex-shrink-0 transition-all duration-300 ease-in-out`}>
      <div className={`p-4 border-b border-slate-800 flex items-center ${isSidebarCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
        <div className="font-bold text-white flex items-center gap-2">
          <div className="bg-indigo-600 p-1 rounded"><Layers size={18} className="text-white" /></div>
          {!isSidebarCollapsed && <span>TaskFlow</span>}
        </div>
        {!isSidebarCollapsed && (
          <button onClick={() => setModalData({ isOpen: true, type: 'workspace' })} className="hover:bg-slate-800 p-1 rounded transition-colors" title="Novo Espaço"><Plus size={16} /></button>
        )}
      </div>
      
      {/* Toggle Button Strip */}
      <div className={`flex items-center border-b border-slate-800 py-2 ${isSidebarCollapsed ? 'justify-center' : 'justify-end px-4'}`}>
         <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
            {isSidebarCollapsed ? <ChevronsRight size={16}/> : <ChevronsLeft size={16}/>}
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="mb-4 space-y-1">
           <button 
             onClick={() => setCurrentView('dashboard')} 
             className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm font-medium ${currentView === 'dashboard' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
             title={isSidebarCollapsed ? "Painel de Controle" : ""}
           >
             <LayoutDashboard size={16} />
             {!isSidebarCollapsed && "Painel de Controle"}
           </button>
        </div>
        {!isSidebarCollapsed && <div className="text-xs font-semibold text-slate-500 px-2 mb-2 uppercase tracking-wider">Espaços de Trabalho</div>}
        
        {workspaces.map(ws => (
          <div key={ws.id}>
            <div className={`flex items-center group justify-between px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer text-sm font-medium text-slate-200 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex items-center gap-2 flex-1" onClick={() => toggleWorkspace(ws.id)} title={isSidebarCollapsed ? ws.name : ""}>
                {!isSidebarCollapsed && (ws.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                <Folder size={14} className="text-indigo-400" />
                {!isSidebarCollapsed && <span className="truncate">{ws.name}</span>}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setModalData({ isOpen: true, type: 'project', parentId: ws.id })} title="Add Project"><Plus size={12} /></button><button onClick={() => deleteItem('workspace', ws.id)} className="text-red-400"><Trash2 size={12} /></button></div>
              )}
            </div>
            {ws.isOpen && (
              <div className={`${isSidebarCollapsed ? 'ml-0 flex flex-col items-center gap-1 mt-1' : 'ml-4 pl-2 border-l border-slate-700 mt-1 space-y-0.5'}`}>
                {ws.projects.map(pj => (
                  <div 
                    key={pj.id} 
                    onClick={() => selectProject(pj.id)} 
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm ${selectedProjectId === pj.id && currentView === 'project' ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-slate-800 text-slate-400'} ${isSidebarCollapsed ? 'justify-center p-2' : ''}`}
                    title={isSidebarCollapsed ? pj.name : ""}
                  >
                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                      <Briefcase size={13} />
                      {!isSidebarCollapsed && <span className="truncate">{pj.name}</span>}
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); setModalData({ isOpen: true, type: 'project', isEditing: true, data: pj }); }} className="text-slate-400 hover:text-indigo-400"><Pencil size={12} /></button><button onClick={(e) => { e.stopPropagation(); deleteItem('project', pj.id); }} className="text-red-400 hover:text-red-300"><Trash2 size={12} /></button></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Quick Add Button when collapsed (optional, since text is hidden) */}
        {isSidebarCollapsed && (
           <div className="mt-4 flex justify-center">
              <button onClick={() => setModalData({ isOpen: true, type: 'workspace' })} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white" title="Novo Espaço"><Plus size={16}/></button>
           </div>
        )}
      </div>
      
      <div className="p-3 border-t border-slate-800">
        <button 
          onClick={() => setModalData({ isOpen: true, type: 'settings' })} 
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
          title={isSidebarCollapsed ? "Configurações" : ""}
        >
          <Settings size={16} />
          {!isSidebarCollapsed && "Configurações"}
        </button>
      </div>
    </div>
  );

  const renderTarget = (target, macroId) => (
    <div key={target.id} className="ml-8 mt-3 mb-4 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => toggleExpand('target', target.id)}>{target.isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}<div className="bg-purple-100 p-1 rounded text-purple-600"><Target size={16} /></div><span className="font-semibold text-gray-700 text-sm">{target.name}</span></div>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-gray-200 rounded p-0.5">
              <button onClick={() => toggleViewMode(target.id, 'list')} className={`p-1 rounded ${target.viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`} title="Lista"><List size={14} /></button>
              <button onClick={() => toggleViewMode(target.id, 'kanban')} className={`p-1 rounded ${target.viewMode === 'kanban' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`} title="Kanban"><Columns size={14} /></button>
              <button onClick={() => toggleViewMode(target.id, 'flow')} className={`p-1 rounded ${target.viewMode === 'flow' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`} title="Fluxo"><Layout size={14} /></button>
           </div>
           <button onClick={() => setModalData({ isOpen: true, type: 'target', isEditing: true, data: target })} className="text-gray-300 hover:text-indigo-500 p-1"><Pencil size={14} /></button>
           <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setModalData({ isOpen: true, type: 'micro', parentId: target.id })}><Plus size={12} className="mr-1" /> Tarefa</Button>
           <button onClick={() => deleteItem('target', target.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
        </div>
      </div>
      {target.isOpen && (
        <div className="p-4">
          {target.micros.length === 0 && target.viewMode !== 'list' ? (
            <div className="py-8 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">Adicione tarefas para ver o fluxo.</div>
          ) : (
             target.viewMode === 'flow' ? (
               <FlowView tasks={target.micros} onDeleteTask={(id) => deleteItem('micro', id)} onUpdateDependency={(targetId, sourceId) => addDependency(target.id, targetId, sourceId)} parentId={target.id} config={config} />
             ) : target.viewMode === 'kanban' ? (
               <KanbanView 
                  tasks={target.micros} 
                  config={config} 
                  onStatusChange={(taskId, newStatus) => updateItem('micro', taskId, { status: newStatus })}
                  onDeleteTask={(id) => deleteItem('micro', id)}
                  onEditTask={(task) => setModalData({ isOpen: true, type: 'micro', isEditing: true, data: task })}
               />
             ) : (
               /* TaskTableView Substitui a lista antiga */
               <TaskTableView 
                 tasks={target.micros} 
                 config={config} 
                 onUpdateTask={(id, payload) => updateItem('micro', id, payload)} 
                 onDeleteTask={(id) => deleteItem('micro', id)} 
                 onAddTask={(payload) => addItem('micro', target.id, payload)} 
               />
             )
          )}
        </div>
      )}
    </div>
  );

  const renderMacro = (macro) => (
    <div key={macro.id} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between group">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand('macro', macro.id)}>
           {macro.isOpen ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
           <div className="flex items-center gap-2"><Layers size={18} className="text-indigo-600" /><h3 className="font-bold text-gray-800">{macro.name}</h3></div>
           <span className="text-xs font-medium bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full shadow-sm">Macro</span>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setModalData({ isOpen: true, type: 'macro', isEditing: true, data: macro })} className="text-gray-400 hover:text-indigo-500 p-1"><Pencil size={14} /></button>
          <Button variant="secondary" size="sm" onClick={() => setModalData({ isOpen: true, type: 'target', parentId: macro.id })}><Target size={14} className="mr-1.5" />Novo Target</Button>
          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteItem('macro', macro.id)}><Trash2 size={16} /></Button>
        </div>
      </div>
      {macro.isOpen && (
        <div className="p-4 bg-gray-50/50 min-h-[50px]">
           {macro.targets.length === 0 && <div className="text-center py-8 text-gray-400 italic">Nenhum target definido.</div>}
           {macro.targets.map(target => renderTarget(target, macro.id))}
        </div>
      )}
    </div>
  );

  const renderProjectView = () => {
    if (!activeProject) return (<div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400"><Briefcase size={64} className="mb-4 opacity-20" /><p className="text-lg font-medium">Selecione um projeto</p></div>);
    return (
      <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><span>{activeWorkspace?.name}</span><ChevronRight size={12} /><span>Projetos</span></div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">{activeProject.name}</h1>
          </div>
          <Button onClick={() => setModalData({ isOpen: true, type: 'macro', parentId: activeProject.id })}><Plus size={16} className="mr-2" />Nova Tarefa Macro</Button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-6xl mx-auto">
            {activeProject.macros.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                  <div className="bg-indigo-50 p-4 rounded-full mb-4"><Layers size={32} className="text-indigo-400" /></div>
                  <h3 className="text-lg font-medium text-gray-900">Projeto Vazio</h3>
                  <Button className="mt-6" onClick={() => setModalData({ isOpen: true, type: 'macro', parentId: activeProject.id })}>Criar Primeira Macro</Button>
                </div>
            ) : activeProject.macros.map(renderMacro)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-white font-sans antialiased text-gray-900">
      {renderSidebar()}
      {currentView === 'dashboard' ? <DashboardView workspaces={workspaces} config={config} /> : renderProjectView()}
      <Modal 
        isOpen={modalData.isOpen} 
        onClose={() => setModalData({ ...modalData, isOpen: false })}
        title={
          modalData.type === 'settings' ? 'Configurações do Sistema' :
          modalData.isEditing ? `Editar ${modalData.type === 'micro' ? 'Tarefa' : modalData.type === 'target' ? 'Target' : 'Item'}` :
          modalData.type === 'workspace' ? 'Novo Espaço de Trabalho' :
          modalData.type === 'project' ? 'Novo Projeto' :
          modalData.type === 'macro' ? 'Nova Tarefa Macro' :
          modalData.type === 'target' ? 'Novo Target (Produto Final)' :
          'Nova Tarefa Micro'
        }
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}