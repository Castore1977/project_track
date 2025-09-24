import React, { useState } from 'react';

// The main application component
const App = () => {
  const [engines, setEngines] = useState([]);
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileInput, setFileInput] = useState(null);

  // Form states
  const [newEngineName, setNewEngineName] = useState('');
  const [newEngineDesc, setNewEngineDesc] = useState('');
  const [statisticalEngines, setStatisticalEngines] = useState([]);
  const [externalEngines, setExternalEngines] = useState([]);
  const [applicationRules, setApplicationRules] = useState([]); // New state for application rules
  const [universe, setUniverse] = useState({});
  const [kpis, setKpis] = useState([]);
  const [changeValidityDate, setChangeValidityDate] = useState('');

  // Modal and view states
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [changeDetails, setChangeDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const resetFormState = () => {
    setNewEngineName('');
    setNewEngineDesc('');
    setStatisticalEngines([]);
    setExternalEngines([]);
    setApplicationRules([]);
    setUniverse({});
    setKpis([]);
    setChangeValidityDate('');
  };

  const loadEngineData = (engine) => {
    const latestVersion = engine.versions[engine.versions.length - 1];
    if (latestVersion && latestVersion.data) {
      setStatisticalEngines(latestVersion.data.statisticalEngines || []);
      setExternalEngines(latestVersion.data.externalEngines || []);
      setApplicationRules(latestVersion.data.applicationRules || []); // Load new rules
      setUniverse(latestVersion.data.universe || {});
      setKpis(latestVersion.data.kpis || []);
    }
  };

  const handleSelectEngine = (engine) => {
    setSelectedEngine(engine);
    setShowTimeline(false);
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
          applicationRules: applicationRules, // Add new rules to data
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
          applicationRules, // Add new rules to data
          universe,
          kpis,
        };
        
        if (trackChanges) {
          const newVersion = {
            versionId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            data: newEngineData,
            validityDate: changeValidityDate,
          };
          updatedVersions.push(newVersion);
        } else {
          const latestVersion = updatedVersions[updatedVersions.length - 1];
          if (latestVersion) {
            latestVersion.data = newEngineData;
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

  const handleDeleteEngine = (engineId) => {
    setEngines(prevEngines => prevEngines.filter(engine => engine.id !== engineId));
    setSelectedEngine(null);
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

  // Helper functions for array-based data (Statistical, External, KPIs)
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
            <h2 className="text-2xl font-bold mb-4">Nuovo Motore</h2>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Nome Motore</label>
              <input
                type="text"
                value={newEngineName}
                onChange={(e) => setNewEngineName(e.target.value)}
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Descrizione</label>
              <textarea
                value={newEngineDesc}
                onChange={(e) => setNewEngineDesc(e.target.value)}
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 h-24"
              />
            </div>
            <button
              onClick={handleCreateEngine}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors mr-2"
            >
              Salva Motore
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                resetFormState();
              }}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Annulla
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
                  onClick={() => setShowTimeline(prev => !prev)}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  {showTimeline ? 'Visualizza Dettagli' : 'Mostra Timeline'}
                </button>
                <button
                  onClick={() => handleDeleteEngine(selectedEngine.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Elimina
                </button>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{selectedEngine.description}</p>
            {isEditing && !showTimeline && (
              <div className="space-y-6">
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Data di validità della modifica</label>
                  <input
                    type="date"
                    value={changeValidityDate}
                    onChange={(e) => setChangeValidityDate(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateEngine(true)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Salva con tracciamento</button>
                  <button onClick={() => handleUpdateEngine(false)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg">Salva senza tracciamento</button>
                </div>
              </div>
            )}

            {showTimeline ? (
              <Timeline versions={selectedEngine.versions} onShowDetails={handleViewDetails} />
            ) : (
              <EngineDetails
                statisticalEngines={statisticalEngines}
                setStatisticalEngines={setStatisticalEngines}
                externalEngines={externalEngines}
                setExternalEngines={setExternalEngines}
                applicationRules={applicationRules} // Pass new rules
                setApplicationRules={setApplicationRules} // Pass new rules setter
                universe={universe}
                setUniverse={setUniverse}
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

// Helper functions for comparing data and generating summaries
const compareArrayChanges = (currentArray, previousArray, sectionName, uniqueKey = 'name') => {
  const changes = [];
  const previousMap = new Map(previousArray.map(item => [item[uniqueKey], item]));
  const currentMap = new Map(currentArray.map(item => [item[uniqueKey], item]));

  // Check for added or modified items
  for (const currentItem of currentArray) {
    const previousItem = previousMap.get(currentItem[uniqueKey]);
    if (!previousItem) {
      changes.push(`Aggiunto ${sectionName}: ${currentItem[uniqueKey]}`);
    } else if (JSON.stringify(currentItem) !== JSON.stringify(previousItem)) {
      changes.push(`Modificato ${sectionName}: ${currentItem[uniqueKey]}`);
    }
  }

  // Check for removed items
  for (const previousItem of previousArray) {
    if (!currentMap.has(previousItem[uniqueKey])) {
      changes.push(`Rimosso ${sectionName}: ${previousItem[uniqueKey]}`);
    }
  }

  return changes;
};

const getChangesSummary = (current, previous) => {
  const changes = [];

  // Check for changes in universe
  if (JSON.stringify(current.universe) !== JSON.stringify(previous.universe)) {
    changes.push('Modificato: Universo di Applicazione');
  }

  // Check for changes in statistical engines
  changes.push(...compareArrayChanges(current.statisticalEngines, previous.statisticalEngines, 'Motore Statistico'));
  
  // Check for changes in external engines
  changes.push(...compareArrayChanges(current.externalEngines, previous.externalEngines, 'Motore Esterno'));

  // Check for changes in application rules
  changes.push(...compareArrayChanges(current.applicationRules, previous.applicationRules, 'Regola di Applicazione'));

  // Check for changes in KPIs
  changes.push(...compareArrayChanges(current.kpis, previous.kpis, 'KPI'));

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
  
  // Compare universe first
  if (JSON.stringify(current.universe) !== JSON.stringify(previous.universe)) {
    details.push({ type: 'modificato', name: 'Universo di Applicazione', section: 'Universo', changes: { description: { before: previous.universe.description, after: current.universe.description } } });
  }

  // Compare other arrays
  compareArrays(current.statisticalEngines, previous.statisticalEngines, 'Motore Statistico', 'name');
  compareArrays(current.externalEngines, previous.externalEngines, 'Motore Esterno', 'name');
  compareArrays(current.applicationRules, previous.applicationRules, 'Regole di Applicazione', 'name'); // Compare new rules
  compareArrays(current.kpis, previous.kpis, 'KPI', 'name');
  
  return details;
};

// React components
const Timeline = ({ versions, onShowDetails }) => {
  return (
    <div className="space-y-8 mt-8">
      <h3 className="text-2xl font-bold mb-4">Cronologia delle Versioni</h3>
      {versions.slice().reverse().map((version, index) => {
        const previousVersionIndex = versions.length - 2 - index;
        const previousVersion = previousVersionIndex >= 0 ? versions[previousVersionIndex] : null;
        const changes = previousVersion ? getChangesSummary(version.data, previousVersion.data) : ['Versione iniziale del motore.'];

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

const EngineDetails = ({ statisticalEngines, setStatisticalEngines, externalEngines, setExternalEngines, applicationRules, setApplicationRules, universe, setUniverse, kpis, setKpis, isEditing, addEntry, updateEntry, deleteEntry }) => {
  return (
    <div className="space-y-8 mt-8">
      {/* Sezione Universo di Applicazione (now first) */}
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
      
      {/* Sezione Regole di Applicazione (NEW) */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Regole di Applicazione</h3>
          {isEditing && <button onClick={() => addEntry(setApplicationRules, { name: '', description: '' })} className="bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 py-1 px-3 rounded-lg text-sm">+</button>}
        </div>
        <div className="space-y-4">
          {applicationRules.map((rule, index) => (
            <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600">
              <label className="block text-sm font-semibold mb-1">Nome Regola</label>
              <input type="text" value={rule.name} onChange={(e) => updateEntry(setApplicationRules, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettagli</label>
              <textarea value={rule.description} onChange={(e) => updateEntry(setApplicationRules, index, 'description', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 h-24"></textarea>
              {isEditing && <button onClick={() => deleteEntry(setApplicationRules, index)} className="mt-2 text-red-500 text-sm">Rimuovi</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Sezione KPI (renamed) */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">KPI</h3>
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

export default App;
