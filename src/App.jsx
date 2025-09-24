import React, { useState } from 'react';

// Funzioni di supporto per confrontare i dati e generare riepiloghi
const compareArrayChanges = (currentArray, previousArray, sectionName, uniqueKey = 'name') => {
  const changes = [];
  const previousMap = new Map(previousArray.map(item => [item[uniqueKey], item]));
  const currentMap = new Map(currentArray.map(item => [item[uniqueKey], item]));

  // Controlla gli elementi aggiunti o modificati
  for (const currentItem of currentArray) {
    const previousItem = previousMap.get(currentItem[uniqueKey]);
    if (!previousItem) {
      changes.push(`Aggiunto ${sectionName}: ${currentItem[uniqueKey]}`);
    } else if (JSON.stringify(currentItem) !== JSON.stringify(previousItem)) {
      changes.push(`Modificato ${sectionName}: ${currentItem[uniqueKey]}`);
    }
  }

  // Controlla gli elementi rimossi
  for (const previousItem of previousArray) {
    if (!currentMap.has(previousItem[uniqueKey])) {
      changes.push(`Rimosso ${sectionName}: ${previousItem[uniqueKey]}`);
    }
  }

  return changes;
};

const getChangesSummary = (currentVersion, previousVersion) => {
  const changes = [];
  const current = currentVersion.data;
  const previous = previousVersion.data;

  // Controlla le modifiche nell'universo
  if (JSON.stringify(current.universe) !== JSON.stringify(previous.universe)) {
    changes.push('Modificato: Universo di Applicazione');
  }
  
  // Controlla le modifiche nei motori statistici
  changes.push(...compareArrayChanges(current.statisticalEngines, previous.statisticalEngines, 'Motore Statistico'));
  
  // Controlla le modifiche nei motori esterni
  changes.push(...compareArrayChanges(current.externalEngines, previous.externalEngines, 'Motore Esterno'));

  // Controlla le modifiche nelle logiche del motore
  changes.push(...compareArrayChanges(current.logicDetails, previous.logicDetails, 'Logica del Motore'));

  // Controlla le modifiche negli impatti
  changes.push(...compareArrayChanges(current.kpis, previous.kpis, 'Impatto'));

  // Controlla le modifiche nella data di validità
  if (currentVersion.validityDate !== previousVersion.validityDate) {
    changes.push(`Modificata data di validità da ${previousVersion.validityDate || 'non definita'} a ${currentVersion.validityDate || 'non definita'}`);
  }

  return changes.length > 0 ? changes : ['Nessuna modifica tracciata.'];
};

const getDetailedChanges = (current, previous) => {
  const details = [];

  const compareObjects = (currentObj, previousObj, type, key) => {
    const changes = {};
    for (const field in currentObj) {
      if (currentObj[field] !== previousObj[field]) {
        changes[field] = { before: previousObj[field], after: currentObj[field] };
      }
    }
    if (Object.keys(changes).length > 0) {
      details.push({ type: 'modificato', name: key, section: type, changes: changes });
    }
  };

  const compareArrays = (currentArr, previousArr, type, uniqueKey) => {
    const previousMap = new Map(previousArr.map(item => [item[uniqueKey], item]));
    const currentMap = new Map(currentArr.map(item => [item[uniqueKey], item]));

    for (const currentItem of currentArr) {
      const previousItem = previousMap.get(currentItem[uniqueKey]);
      if (!previousItem) {
        details.push({ type: 'aggiunto', name: currentItem[uniqueKey], section: type, data: currentItem });
      } else if (JSON.stringify(currentItem) !== JSON.stringify(previousItem)) {
        compareObjects(currentItem, previousItem, type, currentItem[uniqueKey]);
      }
    }

    for (const previousItem of previousArr) {
      if (!currentMap.has(previousItem[uniqueKey])) {
        details.push({ type: 'rimosso', name: previousItem[uniqueKey], section: type, data: previousItem });
      }
    }
  };
  
  if (JSON.stringify(current.universe) !== JSON.stringify(previous.universe)) {
    details.push({ type: 'modificato', name: 'Universo di Applicazione', section: 'Universo', changes: { description: { before: previous.universe.description, after: current.universe.description } } });
  }
  compareArrays(current.statisticalEngines, previous.statisticalEngines, 'Motore Statistico', 'name');
  compareArrays(current.externalEngines, previous.externalEngines, 'Motore Esterno', 'name');
  compareArrays(current.logicDetails, previous.logicDetails, 'Logica del Motore', 'name');
  compareArrays(current.kpis, previous.kpis, 'Impatto', 'name');

  return details;
};

// Componenti React
const DeleteConfirmModal = ({ onConfirm, onCancel, message }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full text-center">
        <h3 className="text-xl font-bold mb-4">Conferma Eliminazione</h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button onClick={onCancel} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Annulla</button>
          <button onClick={onConfirm} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Conferma</button>
        </div>
      </div>
    </div>
  );
};

const Timeline = ({ versions, onShowDetails, onDeleteVersion }) => {
  return (
    <div className="space-y-8 mt-8">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Cronologia delle Versioni</h3>
        {versions.length > 1 && (
          <button 
            onClick={onDeleteVersion} 
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Elimina Ultima Versione
          </button>
        )}
      </div>
      {versions.slice().reverse().map((version, index) => {
        const previousVersionIndex = versions.length - 2 - index;
        const previousVersion = previousVersionIndex >= 0 ? versions[previousVersionIndex] : null;
        const changes = previousVersion ? getChangesSummary(version, previousVersion) : ['Versione iniziale del motore.'];

        return (
          <div key={version.versionId} className="relative pl-6">
            <div className="absolute left-0 top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="absolute left-1.5 top-2 h-full w-0.5 bg-blue-200 dark:bg-blue-800 -z-10"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(version.timestamp).toLocaleString()}</p>
            {version.validityDate && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">Valido da: {version.validityDate}</p>
            )}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mt-2">
              <h4 className="font-semibold text-lg">Versione {versions.length - index}</h4>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                {changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
              {previousVersion && (
                <button
                  onClick={() => onShowDetails(version.data, previousVersion.data)}
                  className="mt-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 py-1 px-3 rounded-lg text-sm"
                >
                  Visualizza Dettaglio
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const GanttTimeline = ({ engines, selectedEngine, onShowDetails, onSelectEngine }) => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 60);

  const dates = [];
  const months = {};
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    dates.push(date);
    const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
    if (!months[monthYear]) {
      months[monthYear] = { count: 0, year: date.getFullYear(), month: date.toLocaleString('default', { month: 'long' }) };
    }
    months[monthYear].count++;
  }

  const getVersionsByDate = (date) => {
    const versions = [];
    const targetEngines = selectedEngine ? [selectedEngine] : engines;

    targetEngines.forEach(engine => {
      engine.versions.forEach((version, index) => {
        // Usa la data di validità se esiste, altrimenti usa la data di creazione
        const timelineDate = version.validityDate ? new Date(version.validityDate) : new Date(version.timestamp);
        if (timelineDate.toDateString() === date.toDateString()) {
          const previousVersion = index > 0 ? engine.versions[index - 1] : null;
          versions.push({
            engineId: engine.id,
            engineName: engine.name,
            version,
            previousVersion,
          });
        }
      });
    });
    return versions;
  };

  const engineColors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500'];
  const getEngineColor = (engineName) => {
    const index = engines.findIndex(e => e.name === engineName);
    return engineColors[index % engineColors.length];
  };

  return (
    <div className="p-4 overflow-x-auto">
      <h3 className="text-2xl font-bold mb-4">Visualizzazione Calendario</h3>
      <div className="flex gap-4 items-center mb-4">
        <label className="text-sm font-semibold">Filtra per motore:</label>
        <select onChange={(e) => {
          const engine = engines.find(eng => eng.id === e.target.value);
          onSelectEngine(engine || null);
        }} value={selectedEngine ? selectedEngine.id : 'all'} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
          <option value="all">Tutti i motori</option>
          {engines.map(engine => <option key={engine.id} value={engine.id}>{engine.name}</option>)}
        </select>
      </div>

      <div className="flex w-full min-w-[768px]">
        {Object.values(months).map((month, index) => (
          <div key={index} className="text-center font-bold text-lg text-gray-700 dark:text-gray-300 border-b border-gray-400" style={{ flexBasis: `${month.count * 32}px`, minWidth: `${month.count * 32}px` }}>
            {month.month} {month.year}
          </div>
        ))}
      </div>
      <div className="flex w-full min-w-[768px]">
        {dates.map((date, index) => (
          <div key={index} className="flex-1 text-center font-semibold text-sm text-gray-500 min-w-[32px]">{date.getDate()}</div>
        ))}
      </div>
      <div className="flex w-full min-w-[768px] border-l border-t border-b rounded-lg bg-gray-50 dark:bg-gray-700">
        {dates.map((date, index) => {
          const mods = getVersionsByDate(date);
          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-start p-1 border-r border-gray-200 dark:border-gray-600 min-w-[32px] min-h-[100px] gap-1">
              {mods.map((mod, modIndex) => (
                <div 
                  key={modIndex} 
                  onClick={() => onShowDetails(mod.version.data, mod.previousVersion.data)} 
                  className={`w-full text-center text-xs mt-1 p-1 rounded-lg text-white cursor-pointer hover:opacity-80 transition-opacity ${getEngineColor(mod.engineName)}`}
                  title={`${mod.engineName} - Valido da: ${mod.version.validityDate || 'Non specificato'}`}
                >
                  {mod.engineName.substring(0, 3)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ChangeDetailsModal = ({ changes, onClose }) => {
  if (!changes) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold">Dettaglio Modifiche</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-6">
          {changes.length === 0 ? (
            <p>Nessuna modifica tracciata per questa versione.</p>
          ) : (
            changes.map((change, index) => (
              <div key={index} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <h4 className="font-semibold text-lg">
                  <span className={`capitalize ${change.type === 'aggiunto' ? 'text-green-500' : change.type === 'rimosso' ? 'text-red-500' : 'text-orange-500'}`}>
                    {change.type}:
                  </span> {change.section} - {change.name}
                </h4>
                {change.type === 'modificato' && (
                  <div className="mt-2 space-y-2 text-sm">
                    {Object.entries(change.changes).map(([field, diff]) => (
                      <div key={field}>
                        <p className="font-medium">{field}:</p>
                        <p className="text-red-400 line-through">Prima: {diff.before}</p>
                        <p className="text-green-400">Dopo: {diff.after}</p>
                      </div>
                    ))}
                  </div>
                )}
                {(change.type === 'aggiunto' || change.type === 'rimosso') && (
                  <pre className="mt-2 p-2 bg-gray-200 dark:bg-gray-900 rounded text-sm overflow-x-auto">{JSON.stringify(change.data, null, 2)}</pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const EngineDetails = ({ statisticalEngines, setStatisticalEngines, externalEngines, setExternalEngines, universe, setUniverse, logicDetails, setLogicDetails, kpis, setKpis, isEditing, addEntry, updateEntry, deleteEntry }) => {
  return (
    <div className="space-y-8 mt-8">
      {/* Sezione Universo di Applicazione */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Universo di Applicazione</h3>
        <textarea value={universe.description || ''} onChange={(e) => setUniverse({ description: e.target.value })} disabled={!isEditing} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 h-24"></textarea>
      </div>

      {/* Sezione Motore Statistico */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Motore Statistico</h3>
          {isEditing && <button onClick={() => addEntry(setStatisticalEngines, { name: '', description: '' })} className="bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 py-1 px-3 rounded-lg text-sm">+</button>}
        </div>
        <div className="space-y-4">
          {statisticalEngines.map((engine, index) => (
            <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600">
              <label className="block text-sm font-semibold mb-1">Nome</label>
              <input type="text" value={engine.name} onChange={(e) => updateEntry(setStatisticalEngines, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettagli</label>
              <textarea value={engine.description} onChange={(e) => updateEntry(setStatisticalEngines, index, 'description', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 h-24"></textarea>
              {isEditing && <button onClick={() => deleteEntry(setStatisticalEngines, index)} className="mt-2 text-red-500 text-sm">Rimuovi</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Sezione Altri Motori Esterni */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Altri Motori Esterni</h3>
          {isEditing && <button onClick={() => addEntry(setExternalEngines, { name: '', description: '' })} className="bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 py-1 px-3 rounded-lg text-sm">+</button>}
        </div>
        <div className="space-y-4">
          {externalEngines.map((engine, index) => (
            <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600">
              <label className="block text-sm font-semibold mb-1">Nome</label>
              <input type="text" value={engine.name} onChange={(e) => updateEntry(setExternalEngines, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettagli</label>
              <textarea value={engine.description} onChange={(e) => updateEntry(setExternalEngines, index, 'description', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 h-24"></textarea>
              {isEditing && <button onClick={() => deleteEntry(setExternalEngines, index)} className="mt-2 text-red-500 text-sm">Rimuovi</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Sezione Logiche del Motore */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Logiche del Motore</h3>
          {isEditing && <button onClick={() => addEntry(setLogicDetails, { name: '', description: '' })} className="bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 py-1 px-3 rounded-lg text-sm">+</button>}
        </div>
        <div className="space-y-4">
          {logicDetails.map((logic, index) => (
            <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600">
              <label className="block text-sm font-semibold mb-1">Nome Logica</label>
              <input type="text" value={logic.name} onChange={(e) => updateEntry(setLogicDetails, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettaglio</label>
              <textarea value={logic.description} onChange={(e) => updateEntry(setLogicDetails, index, 'description', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 h-24"></textarea>
              {isEditing && <button onClick={() => deleteEntry(setLogicDetails, index)} className="mt-2 text-red-500 text-sm">Rimuovi</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Sezione Impatto */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Impatto</h3>
          {isEditing && <button onClick={() => addEntry(setKpis, { name: '', calculation: '', impact: '' })} className="bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 py-1 px-3 rounded-lg text-sm">+</button>}
        </div>
        <div className="space-y-4">
          {kpis.map((kpi, index) => (
            <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600">
              <label className="block text-sm font-semibold mb-1">Nome KPI</label>
              <input type="text" value={kpi.name} onChange={(e) => updateEntry(setKpis, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettaglio Calcolo</label>
              <textarea value={kpi.calculation} onChange={(e) => updateEntry(setKpis, index, 'calculation', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 h-16"></textarea>
              <label className="block text-sm font-semibold mt-2 mb-1">Impatto</label>
              <textarea value={kpi.impact} onChange={(e) => updateEntry(setKpis, index, 'impact', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 h-16"></textarea>
              {isEditing && <button onClick={() => deleteEntry(setKpis, index)} className="mt-2 text-red-500 text-sm">Rimuovi</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Il componente principale dell'applicazione
const App = () => {
  const [engines, setEngines] = useState([]);
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileInput, setFileInput] = useState(null);

  // Stati del form
  const [newEngineName, setNewEngineName] = useState('');
  const [newEngineDesc, setNewEngineDesc] = useState('');
  const [statisticalEngines, setStatisticalEngines] = useState([]);
  const [externalEngines, setExternalEngines] = useState([]);
  const [universe, setUniverse] = useState({});
  const [logicDetails, setLogicDetails] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [changeValidityDate, setChangeValidityDate] = useState('');

  // Stati del modale e della vista
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [timelineView, setTimelineView] = useState('list'); // 'list' or 'gantt'
  const [changeDetails, setChangeDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [engineToDeleteId, setEngineToDeleteId] = useState(null);

  const resetFormState = () => {
    setNewEngineName('');
    setNewEngineDesc('');
    setStatisticalEngines([]);
    setExternalEngines([]);
    setUniverse({});
    setLogicDetails([]);
    setKpis([]);
    setChangeValidityDate('');
  };

  const loadEngineData = (engine) => {
    const latestVersion = engine.versions[engine.versions.length - 1];
    if (latestVersion && latestVersion.data) {
      setStatisticalEngines(latestVersion.data.statisticalEngines || []);
      setExternalEngines(latestVersion.data.externalEngines || []);
      setUniverse(latestVersion.data.universe || {});
      setLogicDetails(latestVersion.data.logicDetails || []);
      setKpis(latestVersion.data.kpis || []);
    }
  };

  const handleSelectEngine = (engine) => {
    setSelectedEngine(engine);
    setTimelineView('list');
    setIsEditing(false);
    setIsCreating(false);
    loadEngineData(engine);
  };

  const handleCreateEngine = () => {
    if (!newEngineName) return;
    
    const newEngine = {
      id: crypto.randomUUID(),
      name: newEngineName,
      description: newEngineDesc,
      versions: [{
        versionId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          statisticalEngines: statisticalEngines,
          externalEngines: externalEngines,
          logicDetails: logicDetails,
          universe: universe,
          kpis: kpis,
        },
      }],
    };
    setEngines(prevEngines => [...prevEngines, newEngine]);
    resetFormState();
    setIsCreating(false);
  };

  const handleUpdateEngine = (trackChanges) => {
    if (!selectedEngine) return;
    
    setEngines(prevEngines => prevEngines.map(engine => {
      if (engine.id === selectedEngine.id) {
        const updatedVersions = [...engine.versions];
        const newEngineData = {
          statisticalEngines,
          externalEngines,
          logicDetails,
          universe,
          kpis,
        };
        
        if (trackChanges) {
          const newVersion = {
            versionId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            data: newEngineData,
            validityDate: changeValidityDate || undefined,
          };
          updatedVersions.push(newVersion);
        } else {
          const latestVersion = updatedVersions[updatedVersions.length - 1];
          if (latestVersion) {
            latestVersion.data = newEngineData;
            if (changeValidityDate) {
              latestVersion.validityDate = changeValidityDate;
            }
          }
        }
        return { ...engine, versions: updatedVersions };
      }
      return engine;
    }));
    
    setIsEditing(false);
    setChangeValidityDate(''); // Reset the date after saving
    setSelectedEngine(null);
  };

  const handleDeleteEngineConfirm = (engineId) => {
    setEngineToDeleteId(engineId);
    setIsDeletingVersion(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteVersionConfirm = () => {
    setIsDeletingVersion(true);
    setShowDeleteConfirm(true);
  };
  
  const handleConfirmDelete = () => {
    if (isDeletingVersion) {
      setEngines(prevEngines => prevEngines.map(engine => {
        if (engine.id === selectedEngine.id) {
          const newVersions = engine.versions.slice(0, -1);
          const newLatestVersion = newVersions[newVersions.length - 1];
          if (newLatestVersion) {
            loadEngineData({ versions: newVersions });
          } else {
            // If no versions are left, clear all data and unselect engine
            resetFormState();
            setSelectedEngine(null);
          }
          return { ...engine, versions: newVersions };
        }
        return engine;
      }));
      
    } else {
      setEngines(prevEngines => prevEngines.filter(engine => engine.id !== engineToDeleteId));
      setSelectedEngine(null);
    }
    setShowDeleteConfirm(false);
    setEngineToDeleteId(null);
    setIsDeletingVersion(false);
  };
  
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setEngineToDeleteId(null);
    setIsDeletingVersion(false);
  };

  // Import and Export functions
  const handleExport = () => {
    const dataStr = JSON.stringify(engines, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'engines.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedEngines = JSON.parse(e.target.result);
        if (!Array.isArray(importedEngines)) {
          console.error("Imported file is not a valid JSON array.");
          return;
        }
        setEngines(importedEngines);
        console.log("Import successful!");
      } catch (error) {
        console.error("Error importing file: ", error);
      }
    };
    reader.readAsText(file);
  };

  const handleImportButtonClick = () => {
    fileInput.click();
  };
  
  const handleViewDetails = (currentData, previousData) => {
    const details = getDetailedChanges(currentData, previousData);
    setChangeDetails(details);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setChangeDetails(null);
  };

  // Funzioni di supporto per dati basati su array (Statistico, Esterno, Logica, Impatto)
  const addEntry = (setter, emptyEntry) => setter(prev => [...prev, emptyEntry]);
  const updateEntry = (setter, index, key, value) => {
    setter(prev => {
      const newArray = [...prev];
      newArray[index] = { ...newArray[index], [key]: value };
      return newArray;
    });
  };
  const deleteEntry = (setter, index) => setter(prev => prev.filter((_, i) => i !== index));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-900 dark:text-gray-100">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans p-6 flex flex-col lg:flex-row gap-6">
      {showDeleteConfirm && (
        <DeleteConfirmModal 
          onConfirm={handleConfirmDelete} 
          onCancel={handleCancelDelete} 
          message={isDeletingVersion ? 'Sei sicuro di voler eliminare l\'ultima versione? Questa azione ripristinerà il motore allo stato precedente.' : 'Sei sicuro di voler eliminare questo motore? Questa azione è irreversibile.'}
        />
      )}
      <div className="lg:w-1/4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Motori di Rischio</h2>
        <div className="flex flex-col space-y-2 mb-4">
          <button
            onClick={() => {
              setIsCreating(true);
              setSelectedEngine(null);
              resetFormState();
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Crea Nuovo Motore
          </button>
          <button
            onClick={handleImportButtonClick}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Importa da JSON
          </button>
          <input
            type="file"
            ref={setFileInput}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />
          <button
            onClick={handleExport}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Esporta in JSON
          </button>
        </div>
        <ul className="space-y-2">
          {engines.map(engine => (
            <li key={engine.id}>
              <div
                className={`p-3 rounded-lg cursor-pointer transition-colors border-2 ${selectedEngine && selectedEngine.id === engine.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => handleSelectEngine(engine)}
              >
                <div className="font-semibold">{engine.name}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{engine.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {isCreating ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Nuovo Motore</h2>
              <button
                onClick={() => {
                  setIsCreating(false);
                  resetFormState();
                }}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Indietro
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Nome Motore</label>
              <input
                type="text"
                value={newEngineName}
                onChange={(e) => setNewEngineName(e.target.value)}
                className="w-full p-2 border rounded-lg bg-gray-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Descrizione</label>
              <textarea
                value={newEngineDesc}
                onChange={(e) => setNewEngineDesc(e.target.value)}
                className="w-full p-2 border rounded-lg bg-gray-500 dark:bg-gray-700 dark:border-gray-600 h-24"
              />
            </div>
            <button
              onClick={handleCreateEngine}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors mr-2"
            >
              Salva Motore
            </button>
          </div>
        ) : selectedEngine ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold">{selectedEngine.name}</h2>
              <div className="space-x-2">
                <button
                  onClick={() => setIsEditing(prev => !prev)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  {isEditing ? 'Visualizza' : 'Modifica'}
                </button>
                <button
                  onClick={() => setTimelineView(prev => prev === 'list' ? 'gantt' : 'list')}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  {timelineView === 'list' ? 'Visualizza Calendario' : 'Mostra Lista'}
                </button>
                <button
                  onClick={() => handleDeleteEngineConfirm(selectedEngine.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Elimina
                </button>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{selectedEngine.description}</p>
            {isEditing && (
              <div className="space-y-6">
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Data di validità della modifica</label>
                  <input
                    type="date"
                    value={changeValidityDate}
                    onChange={(e) => setChangeValidityDate(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-gray-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateEngine(true)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Salva con tracciamento</button>
                  <button onClick={() => handleUpdateEngine(false)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg">Salva senza tracciamento</button>
                  <button onClick={() => {
                      setIsEditing(false);
                      setSelectedEngine(null);
                  }} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Indietro</button>
                </div>
              </div>
            )}
            {timelineView === 'list' && !isEditing ? (
              <Timeline 
                versions={selectedEngine.versions} 
                onShowDetails={handleViewDetails} 
                onDeleteVersion={handleDeleteVersionConfirm} 
              />
            ) : timelineView === 'gantt' && !isEditing ? (
              <GanttTimeline engines={engines} selectedEngine={selectedEngine} onShowDetails={handleViewDetails} onSelectEngine={handleSelectEngine} />
            ) : (
                <EngineDetails
                  statisticalEngines={statisticalEngines}
                  setStatisticalEngines={setStatisticalEngines}
                  externalEngines={externalEngines}
                  setExternalEngines={setExternalEngines}
                  universe={universe}
                  setUniverse={setUniverse}
                  logicDetails={logicDetails}
                  setLogicDetails={setLogicDetails}
                  kpis={kpis}
                  setKpis={setKpis}
                  isEditing={isEditing}
                  addEntry={addEntry}
                  updateEntry={updateEntry}
                  deleteEntry={deleteEntry}
                />
            )}
          </div>
        ) : (
          <div className="text-center p-12 text-gray-500 dark:text-gray-400">
            <h3 className="text-xl font-semibold mb-2">Seleziona un motore dalla lista o creane uno nuovo per iniziare.</h3>
          </div>
        )}
      </div>
      {isModalOpen && (
        <ChangeDetailsModal changes={changeDetails} onClose={closeModal} />
      )}
      </div>
  );
};

export default App;
