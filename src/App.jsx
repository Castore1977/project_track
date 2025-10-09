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
    // Gestione della modifica dell'universo
    const changes = {};
    if (current.universe.description !== previous.universe.description) {
        changes.description = { before: previous.universe.description, after: current.universe.description };
    }
    if (Object.keys(changes).length > 0) {
        details.push({ type: 'modificato', name: 'Universo di Applicazione', section: 'Universo', changes });
    }
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

// Nuovo componente per la timeline combinata
const AllEnginesTimeline = ({ engines, onShowDetails, onDeleteVersion }) => {
    const [filterEngineId, setFilterEngineId] = useState('all');

    // 1. Raccogli tutte le versioni con i dati del motore
    const allVersions = engines.flatMap(engine => 
        engine.versions.map((version, index) => ({
            ...version,
            engineId: engine.id,
            engineName: engine.name,
            engineVersions: engine.versions, // Passa tutte le versioni del motore per calcolare la versione precedente
            versionIndex: index,
        }))
    ).filter(v => filterEngineId === 'all' || v.engineId === filterEngineId)
     .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Ordina dalla più recente

    const engineColors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'];
    const getEngineColor = (engineId) => {
        const index = engines.findIndex(e => e.id === engineId);
        return engineColors[index % engineColors.length];
    };

    return (
        <div className="space-y-8 mt-8">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Cronologia delle Versioni Combinata</h3>
            </div>
            
            <div className="flex gap-4 items-center mb-4">
                <label className="text-sm font-semibold">Filtra per motore:</label>
                <select onChange={(e) => setFilterEngineId(e.target.value)} 
                        value={filterEngineId} 
                        className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <option value="all">Tutti i motori</option>
                    {engines.map(engine => <option key={engine.id} value={engine.id}>{engine.name}</option>)}
                </select>
            </div>
            
            <div className="space-y-4">
                {allVersions.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">Nessuna versione da visualizzare.</p>
                ) : (
                    allVersions.map((version, index) => {
                        const previousVersion = version.versionIndex > 0 ? version.engineVersions[version.versionIndex - 1] : null;
                        
                        // Per il riepilogo, usiamo la versione corrente e la precedente (se esiste)
                        const changes = previousVersion 
                            ? getChangesSummary(version, previousVersion) 
                            : ['Versione iniziale del motore.'];

                        const engineColorClass = getEngineColor(version.engineId);
                        const isLatestVersionOfEngine = version.versionIndex === version.engineVersions.length - 1; // Verifica se è l'ultima versione di quel motore

                        return (
                            <div 
                                key={version.versionId} 
                                className={`p-4 rounded-lg shadow-md transition-transform flex items-start space-x-4 
                                            ${isLatestVersionOfEngine && filterEngineId !== version.engineId ? 'ring-2 ring-purple-400' : ''}
                                            ${engineColorClass} bg-opacity-10 dark:bg-opacity-20`}
                                // Gestione del click per i dettagli
                                onClick={() => {
                                    if(previousVersion) {
                                        onShowDetails(version.data, previousVersion.data);
                                    }
                                }}
                            >
                                <div className={`w-3 h-3 rounded-full ${engineColorClass} flex-shrink-0 mt-1.5`}></div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-semibold text-lg ${engineColorClass.replace('bg-', 'text-')}`}>
                                            {version.engineName} - Versione {version.versionIndex + 1}
                                        </h4>
                                        
                                        {/* Bottone Rollback (visibile solo se non è la versione iniziale) */}
                                        {version.versionIndex > 0 && isLatestVersionOfEngine && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Evita di aprire il modale dei dettagli
                                                    onDeleteVersion(version.engineId, version.engineName);
                                                }}
                                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow-md ml-4"
                                            >
                                                Rollback (Elimina Ultima)
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        Data Creazione: {new Date(version.timestamp).toLocaleString()}
                                        {version.validityDate && ` | Valido da: ${version.validityDate}`}
                                        {isLatestVersionOfEngine && <span className="ml-2 font-bold text-green-600 dark:text-green-400">(ULTIMA DEL MOTORE)</span>}
                                    </p>
                                    <ul className="list-disc list-inside text-sm mt-2 text-gray-800 dark:text-gray-200 space-y-1">
                                        {/* Mostra solo il primo elemento per una sintesi concisa */}
                                        <li className="font-medium truncate">{changes[0]}</li>
                                        {changes.length > 1 && <li className="text-gray-500 dark:text-gray-400 text-xs">... (+{changes.length - 1} altre modifiche)</li>}
                                    </ul>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};


// Componente eliminato: GanttTimeline

// Componente mantenuto per consistenza, ma non più utilizzato nel flusso principale.
const Timeline = ({ versions, onShowDetails, onDeleteVersion }) => {
  return (
    <div className="space-y-8 mt-8">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Cronologia del Motore Corrente (Vista Deprecata)</h3>
        {versions.length > 1 && (
          <button 
            onClick={() => onDeleteVersion(versions[0].engineId, versions[0].engineName)} 
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Elimina Ultima Versione
          </button>
        )}
      </div>
      {versions.slice().reverse().map((version, index) => {
        const originalIndex = versions.length - 1 - index;
        const previousVersion = originalIndex > 0 ? versions[originalIndex - 1] : null;
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


const ChangeDetailsModal = ({ changes, onClose }) => {
  if (!changes) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
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
        <textarea value={universe.description || ''} onChange={(e) => setUniverse({ description: e.target.value })} disabled={!isEditing} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-24"></textarea>
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
              <input type="text" value={engine.name} onChange={(e) => updateEntry(setStatisticalEngines, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettagli</label>
              <textarea value={engine.description} onChange={(e) => updateEntry(setStatisticalEngines, index, 'description', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-24"></textarea>
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
              <input type="text" value={engine.name} onChange={(e) => updateEntry(setExternalEngines, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettagli</label>
              <textarea value={engine.description} onChange={(e) => updateEntry(setExternalEngines, index, 'description', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-24"></textarea>
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
              <input type="text" value={logic.name} onChange={(e) => updateEntry(setLogicDetails, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettaglio</label>
              <textarea value={logic.description} onChange={(e) => updateEntry(setLogicDetails, index, 'description', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-24"></textarea>
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
              <input type="text" value={kpi.name} onChange={(e) => updateEntry(setKpis, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettaglio Calcolo</label>
              <textarea value={kpi.calculation} onChange={(e) => updateEntry(setKpis, index, 'calculation', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-16"></textarea>
              <label className="block text-sm font-semibold mt-2 mb-1">Impatto</label>
              <textarea value={kpi.impact} onChange={(e) => updateEntry(setKpis, index, 'impact', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-16"></textarea>
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
  const [timelineView, setTimelineView] = useState('combined'); 
  const [changeDetails, setChangeDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [engineToDeleteId, setEngineToDeleteId] = useState(null);
  const [engineToDeleteName, setEngineToDeleteName] = useState(null); // Nuovo stato per il nome del motore
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(null); // Nuovo stato per il messaggio OK

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
    } else {
        // Se non ci sono versioni, resetta i dati a vuoto
        setStatisticalEngines([]);
        setExternalEngines([]);
        setUniverse({});
        setLogicDetails([]);
        setKpis([]);
    }
  };

  const handleSelectEngine = (engine) => {
    setSelectedEngine(engine);
    // Quando seleziono un motore, mostro la vista combinata di default
    if (engine) {
        setTimelineView('combined'); 
        setIsEditing(false);
        setIsCreating(false);
        loadEngineData(engine);
    }
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
    setSelectedEngine(newEngine); // Seleziona il motore appena creato
  };

  const handleUpdateEngine = (trackChanges) => {
    if (!selectedEngine) return;
    
    const newEngineData = {
        statisticalEngines,
        externalEngines,
        logicDetails,
        universe,
        kpis,
    };

    setEngines(prevEngines => prevEngines.map(engine => {
      if (engine.id === selectedEngine.id) {
        const updatedVersions = [...engine.versions];
        
        if (trackChanges) {
          const newVersion = {
            versionId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            data: newEngineData,
            validityDate: changeValidityDate || undefined,
          };
          updatedVersions.push(newVersion);
        } else {
          // Modifica l'ultima versione senza creare una nuova
          const latestVersion = updatedVersions[updatedVersions.length - 1];
          if (latestVersion) {
            latestVersion.data = newEngineData;
            if (changeValidityDate) {
              latestVersion.validityDate = changeValidityDate;
            }
            latestVersion.timestamp = new Date().toISOString(); // Aggiorna il timestamp dell'ultima versione
          }
        }
        return { ...engine, versions: updatedVersions };
      }
      return engine;
    }));
    
    setIsEditing(false);
    setChangeValidityDate(''); // Reset della data dopo il salvataggio
    // Aggiorna lo stato dei dati mostrati
    loadEngineData({ ...selectedEngine, versions: trackChanges ? [...selectedEngine.versions, { data: newEngineData, validityDate: changeValidityDate }] : selectedEngine.versions });
  };

  const handleDeleteEngineConfirm = (engineId) => {
    setEngineToDeleteId(engineId);
    setIsDeletingVersion(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteVersionConfirm = (engineId, engineName) => {
    setEngineToDeleteId(engineId);
    setEngineToDeleteName(engineName);
    setIsDeletingVersion(true);
    setShowDeleteConfirm(true);
  };
  
  const handleConfirmDelete = () => {
    let deletedEngineName = null;
    
    if (isDeletingVersion) {
      setEngines(prevEngines => prevEngines.map(engine => {
        if (engine.id === engineToDeleteId) {
          if (engine.versions.length > 1) {
              deletedEngineName = engine.name;
              const newVersions = engine.versions.slice(0, -1);
              
              // Se l'engine correntemente selezionato è quello che stiamo modificando
              if (selectedEngine && selectedEngine.id === engineToDeleteId) {
                  // Ricarica i dati della penultima versione
                  loadEngineData({ versions: newVersions });
              }
              return { ...engine, versions: newVersions };
          }
        }
        return engine;
      }).filter(engine => engine.versions.length > 0)); // Rimuove motori senza versioni

      if (deletedEngineName) {
        // Mostra il messaggio OK esplicito
        setShowConfirmationMessage(`OK! L'ultima versione di '${deletedEngineName}' è stata eliminata. Il motore è stato riportato allo stato precedente.`);
        setTimeout(() => setShowConfirmationMessage(null), 5000); // Nascondi dopo 5 secondi
      }
      
      // Se stiamo eliminando l'ultima versione di un motore e non rimangono versioni, deselezionalo
      const currentEngine = engines.find(e => e.id === engineToDeleteId);
      if (currentEngine && currentEngine.versions.length <= 1) {
          setSelectedEngine(null);
      }
      
    } else {
      // Eliminazione completa del motore
      const engineName = engines.find(e => e.id === engineToDeleteId)?.name || 'Motore Sconosciuto';
      setEngines(prevEngines => prevEngines.filter(engine => engine.id !== engineToDeleteId));
      setSelectedEngine(null);

      // Mostra il messaggio OK esplicito
      setShowConfirmationMessage(`OK! Il motore '${engineName}' è stato eliminato definitivamente.`);
      setTimeout(() => setShowConfirmationMessage(null), 5000);
    }

    // Reset degli stati del modale
    setShowDeleteConfirm(false);
    setEngineToDeleteId(null);
    setEngineToDeleteName(null);
    setIsDeletingVersion(false);
  };
  
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setEngineToDeleteId(null);
    setEngineToDeleteName(null);
    setIsDeletingVersion(false);
  };

  // Funzione di Export aggiornata con data, ora e minuto nel nome del file
  const handleExport = () => {
    const dataStr = JSON.stringify(engines, null, 2);
    const date = new Date();
    // Formato: YYYYMMDD_HHmm
    const filename = `engines_backup_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}.json`;
    
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
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
        // Deseleziona l'engine corrente dopo l'import
        setSelectedEngine(null); 
        resetFormState();
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
    // Se previousData non è disponibile (es. versione iniziale) non fare il dettaglio
    if (!previousData) return; 
    const details = getDetailedChanges(currentData, previousData);
    setChangeDetails(details);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setChangeDetails(null);
  };

  // Funzione non più necessaria, ma mantenuta per pulizia
  const handleBackToList = () => {
    setTimelineView('combined'); 
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

  // Determina se mostrare l'EngineDetails (modalità modifica o creazione) o la Timeline
  const showEngineDetails = isCreating || isEditing;
  const deleteMessage = isDeletingVersion 
    ? `Sei sicuro di voler eliminare l'ultima versione di '${engineToDeleteName}'? Questa azione ripristinerà il motore allo stato precedente (Rollback).`
    : 'Sei sicuro di voler eliminare questo motore? Questa azione è irreversibile.';


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans p-6 flex flex-col lg:flex-row gap-6">
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        body { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* MODALE DI CONFERMA ELIMINAZIONE/ROLLBACK */}
      {showDeleteConfirm && (
        <DeleteConfirmModal 
          onConfirm={handleConfirmDelete} 
          onCancel={handleCancelDelete} 
          message={deleteMessage}
        />
      )}
      
      {/* MESSAGGIO DI CONFERMA OK */}
      {showConfirmationMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-xl z-50 animate-bounce">
            {showConfirmationMessage}
        </div>
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
        <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
          {engines.map(engine => (
            <li key={engine.id}>
              <div
                className={`p-3 rounded-lg cursor-pointer transition-colors border-2 ${selectedEngine && selectedEngine.id === engine.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => handleSelectEngine(engine)}
                onDoubleClick={() => {
                    handleSelectEngine(engine);
                    setIsEditing(true);
                }}
              >
                <div className="font-semibold">{engine.name}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{engine.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {showEngineDetails ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{isCreating ? 'Nuovo Motore' : selectedEngine.name}</h2>
              <div className="space-x-2">
                  {isEditing && (
                      <button
                           onClick={() => {
                           setIsEditing(prev => !prev);
                           // Ricarica i dati dell'ultima versione se si esce dalla modalità di modifica
                           if (isEditing) {
                               loadEngineData(selectedEngine);
                           }
                         }}
                         className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                       >
                           Visualizza Cronologia
                       </button>
                  )}
                   {isCreating && (
                       <button
                           onClick={() => {
                           setIsCreating(false);
                           resetFormState();
                           }}
                           className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                       >
                           Indietro
                       </button>
                   )}
                   {selectedEngine && !isCreating && (
                       <button
                         onClick={() => handleDeleteEngineConfirm(selectedEngine.id)}
                         className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                       >
                         Elimina Motore
                       </button>
                   )}
              </div>
            </div>

            {isCreating ? (
                <>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2">Nome Motore</label>
                        <input
                            type="text"
                            value={newEngineName}
                            onChange={(e) => setNewEngineName(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2">Descrizione</label>
                        <textarea
                            value={newEngineDesc}
                            onChange={(e) => setNewEngineDesc(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-24"
                        />
                    </div>
                    <button
                        onClick={handleCreateEngine}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors mr-2"
                    >
                        Salva Motore
                    </button>
                </>
            ) : (
                <>
                {/* Sezione Modifica/Salvataggio */}
                {isEditing && (
                  <div className="space-y-6 mb-6 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-2">Data di validità della modifica</label>
                      <input
                        type="date"
                        value={changeValidityDate}
                        onChange={(e) => setChangeValidityDate(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600"
                      />
                      <p className="text-xs text-gray-500 mt-1">Lascia vuoto se non è richiesto un tracciamento specifico per data.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateEngine(true)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Salva con tracciamento</button>
                      <button onClick={() => handleUpdateEngine(false)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg">Salva senza tracciamento (Sovrascrive l'ultima versione)</button>
                      <button onClick={() => {
                        setIsEditing(false);
                        loadEngineData(selectedEngine); // Annulla ripristinando l'ultima versione
                      }} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Annulla</button>
                    </div>
                  </div>
                )}
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
                </>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-3xl font-bold">Cronologia Motori</h2>
               <div className="space-x-2">
                   {selectedEngine && (
                       <button
                           onClick={() => setIsEditing(true)}
                           className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                       >
                           Modifica Motore
                       </button>
                   )}
                   {/* Ho rimosso il pulsante "Elimina Ultima Versione" da qui perché è ora gestito elemento per elemento nella lista AllEnginesTimeline */}
               </div>
            </div>
            
            <AllEnginesTimeline 
                engines={engines} 
                onShowDetails={handleViewDetails} 
                onDeleteVersion={handleDeleteVersionConfirm} // Passiamo la funzione aggiornata
            />
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
