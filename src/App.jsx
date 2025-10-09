import React, { useState } from 'react';

// === FUNZIONI DI SUPPORTO PER IL CONFRONTO E IL RIEPILOGO ===

/**
 * Confronta due array di oggetti per rilevare aggiunte, rimozioni e modifiche.
 * @param {Array} currentArray - Array della versione corrente.
 * @param {Array} previousArray - Array della versione precedente.
 * @param {string} sectionName - Nome della sezione per la messaggistica.
 * @param {string} uniqueKey - Chiave unica per identificare gli elementi (es. 'name').
 * @returns {Array} Lista di stringhe che descrivono le modifiche.
 */
const compareArrayChanges = (currentArray, previousArray, sectionName, uniqueKey = 'name') => {
  const changes = [];
  // I `new new Map` originali sembrano un errore di battitura, li ho corretti a `new Map`
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

/**
 * Genera un riepilogo conciso delle modifiche tra due versioni.
 */
const getChangesSummary = (currentVersion, previousVersion) => {
  const allChanges = [];

  const summarizeChanges = (currentArray, previousArray, sectionName) => {
      // Garantisce che gli array siano definiti per evitare errori
      const cArr = currentArray || [];
      const pArr = previousArray || [];
      const changes = compareArrayChanges(cArr, pArr, sectionName);
      
      changes.forEach(change => {
          // Ricostruisce la stringa per chiarezza nel riepilogo
          allChanges.push(`[${sectionName}] ${change.split(': ').slice(0, 1).join(': ')}: ${change.split(': ').slice(1).join(': ')}`);
      });
  };

  // Garantisce che i dati siano definiti
  const current = currentVersion.data || {};
  const previous = previousVersion.data || {};

  // 1. Universo di Applicazione
  if (JSON.stringify(current.universe) !== JSON.stringify(previous.universe)) {
    allChanges.push('[Universo] Modificato: Contenuto aggiornato.');
  }
  
  // 2. Motori statistici
  summarizeChanges(current.statisticalEngines, previous.statisticalEngines, 'Motore Statistico');
  
  // 3. Motori esterni
  summarizeChanges(current.externalEngines, previous.externalEngines, 'Motore Esterno');

  // 4. Logiche del motore
  summarizeChanges(current.logicDetails, previous.logicDetails, 'Logica');

  // 5. Impatti (KPI)
  summarizeChanges(current.kpis, previous.kpis, 'KPI');
  
  // 6. Documentazione (Gestisce anche il caso di versioni vecchie senza documentation)
  summarizeChanges(current.documentation, previous.documentation, 'Documentazione');

  // 7. Data di validità (prioritaria)
  if (currentVersion.validityDate !== previousVersion.validityDate) {
    allChanges.unshift(`Data di validità: ${previousVersion.validityDate || 'non definita'} -> ${currentVersion.validityDate || 'non definita'}`);
  }

  // Restituisce il riepilogo
  return allChanges.length > 0 ? allChanges : ['Nessuna modifica tracciata.'];
};

/**
 * Genera il dettaglio completo delle modifiche campo per campo.
 */
const getDetailedChanges = (current, previous) => {
  const details = [];

  const compareObjects = (currentObj, previousObj, type, key) => {
    const changes = {};
    for (const field in currentObj) {
      // Ignora la comparazione se la chiave non esiste nel precedente (dovrebbe essere gestita da compareArrays)
      if (!previousObj.hasOwnProperty(field)) continue; 
      
      // Controllo di uguaglianza semplice, funziona per stringhe e numeri
      if (currentObj[field] !== previousObj[field]) {
        changes[field] = { 
          before: previousObj[field] || '[Vuoto]', 
          after: currentObj[field] || '[Vuoto]' 
        };
      }
    }
    
    // Controlla campi rimossi se erano presenti in precedente ma non in corrente
     for (const field in previousObj) {
        if (!currentObj.hasOwnProperty(field)) {
            changes[field] = { before: previousObj[field] || '[Vuoto]', after: '[Rimosso]' };
        }
    }

    if (Object.keys(changes).length > 0) {
      details.push({ type: 'modificato', name: key, section: type, changes: changes });
    }
  };

  const compareArrays = (currentArr, previousArr, type, uniqueKey) => {
    // Aggiunto controllo di fallback ad array vuoto per robustezza
    const cArr = currentArr || [];
    const pArr = previousArr || [];

    const previousMap = new Map(pArr.map(item => [item[uniqueKey], item]));
    const currentMap = new Map(cArr.map(item => [item[uniqueKey], item]));

    for (const currentItem of cArr) {
      const previousItem = previousMap.get(currentItem[uniqueKey]);
      if (!previousItem) {
        details.push({ type: 'aggiunto', name: currentItem[uniqueKey], section: type, data: currentItem });
      } else if (JSON.stringify(currentItem) !== JSON.stringify(previousItem)) {
        compareObjects(currentItem, previousItem, type, currentItem[uniqueKey]);
      }
    }

    for (const previousItem of pArr) {
      if (!currentMap.has(previousItem[uniqueKey])) {
        details.push({ type: 'rimosso', name: previousItem[uniqueKey], section: type, data: previousItem });
      }
    }
  };
  
  // Confronto Universo di Applicazione
  const currentData = current || {};
  const previousData = previous || {};

  if (JSON.stringify(currentData.universe) !== JSON.stringify(previousData.universe)) {
    const changes = {};
    const currentUniverse = currentData.universe || {};
    const previousUniverse = previousData.universe || {};
    
    if (currentUniverse.description !== previousUniverse.description) {
        changes.description = { 
            before: previousUniverse.description || '[Vuoto]', 
            after: currentUniverse.description || '[Vuoto]' 
        };
    }
    if (Object.keys(changes).length > 0) {
      details.push({ type: 'modificato', name: 'Universo di Applicazione', section: 'Universo', changes });
    }
  }
  
  compareArrays(currentData.statisticalEngines, previousData.statisticalEngines, 'Motore Statistico', 'name');
  compareArrays(currentData.externalEngines, previousData.externalEngines, 'Motore Esterno', 'name');
  compareArrays(currentData.logicDetails, previousData.logicDetails, 'Logica del Motore', 'name');
  compareArrays(currentData.kpis, previousData.kpis, 'Impatto', 'name');
  compareArrays(currentData.documentation, previousData.documentation, 'Documentazione', 'name');

  return details;
};


// === VALIDAZIONE STRUTTURALE (AGGIORNATA PER LA COMPATIBILITÀ) ===

/**
 * Esegue una validazione di base sulla struttura dei motori importati.
 * Ora accetta la mancanza dell'array `documentation` per i JSON più vecchi.
 */
const validateImportedEngines = (engines) => {
    if (!Array.isArray(engines)) return false;
    
    for (const engine of engines) {
        // Controlla le proprietà di base dell'Engine
        if (!engine || typeof engine.id !== 'string' || typeof engine.name !== 'string' || !Array.isArray(engine.versions)) {
            console.error("Validazione fallita: Motore o Versions non validi.", engine);
            return false;
        }
        
        for (const version of engine.versions) {
            // Controlla le proprietà di base della Versione
            if (!version || typeof version.versionId !== 'string' || !version.data || typeof version.timestamp !== 'string') {
                console.error("Validazione fallita: Versione non valida.", version);
                return false;
            }
            
            // Controlla che il blocco dati contenga le strutture chiave previste
            const data = version.data;
            if (
                !data || 
                !Array.isArray(data.statisticalEngines) || 
                !Array.isArray(data.externalEngines) ||
                !Array.isArray(data.logicDetails) ||
                !Array.isArray(data.kpis) ||
                typeof data.universe !== 'object' || data.universe === null
            ) {
                 console.error("Validazione fallita: Struttura dati della versione incompleta (mancano array principali o universe).", data);
                 return false;
            }
            
            // *** PUNTO DI COMPATIBILITÀ ***
            // Se 'documentation' è presente, deve essere un array.
            // Se è assente, è accettato (vecchio formato JSON).
            if (data.documentation !== undefined && !Array.isArray(data.documentation)) {
                console.error("Validazione fallita: documentation è presente ma non è un array.", data);
                return false;
            }
        }
    }
    return true;
};


// === COMPONENTI REACT ===

const DeleteConfirmModal = ({ onConfirm, onCancel, message }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full text-center text-gray-900 dark:text-gray-100">
        <h3 className="text-xl font-bold mb-4">Conferma Eliminazione</h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button onClick={onCancel} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Annulla</button>
          <button onClick={onConfirm} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Conferma</button>
        </div>
      </div>
    </div>
  );
};

const AllEnginesTimeline = ({ engines, onShowDetails, onDeleteVersion }) => {
    const [filterEngineId, setFilterEngineId] = useState('all');

    // 1. Raccogli tutte le versioni con i dati del motore
    const allVersions = engines.flatMap(engine => {
        // Filtra motori senza versioni (dovrebbero essere già filtrati, ma per sicurezza)
        if (!engine.versions || engine.versions.length === 0) return [];
        
        return engine.versions.map((version, index) => ({
            ...version,
            engineId: engine.id,
            engineName: engine.name,
            engineVersions: engine.versions, // Passa tutte le versioni del motore per calcolare la versione precedente
            versionIndex: index,
        }));
    })
    .filter(v => filterEngineId === 'all' || v.engineId === filterEngineId)
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
            
            <div className="flex flex-wrap gap-4 items-center mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner">
                <label className="text-sm font-semibold flex-shrink-0">Filtra per motore:</label>
                <select onChange={(e) => setFilterEngineId(e.target.value)} 
                        value={filterEngineId} 
                        className="p-2 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500">
                    <option value="all">Tutti i motori</option>
                    {engines.map(engine => <option key={engine.id} value={engine.id}>{engine.name}</option>)}
                </select>
            </div>
            
            <div className="space-y-4">
                {allVersions.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 p-8 border-2 border-dashed rounded-lg">Nessuna versione da visualizzare. Crea un motore per iniziare.</p>
                ) : (
                    allVersions.map((version, index) => {
                        const previousVersion = version.versionIndex > 0 ? version.engineVersions[version.versionIndex - 1] : null;
                        
                        const changes = previousVersion 
                            ? getChangesSummary(version, previousVersion) 
                            : ['Versione iniziale del motore.'];

                        const engineColorClass = getEngineColor(version.engineId);
                        const isLatestVersionOfEngine = version.versionIndex === version.engineVersions.length - 1; // Verifica se è l'ultima versione di quel motore

                        // Classe per lo sfondo della card
                        const cardBgClass = engineColorClass.replace('bg-', 'bg-') + ' bg-opacity-10 dark:bg-opacity-20';
                        // Classe per il testo dell'intestazione
                        const textHeaderClass = engineColorClass.replace('bg-', 'text-');
                        
                        return (
                            <div 
                                key={version.versionId} 
                                className={`p-4 rounded-xl shadow-md transition-all flex flex-col space-y-2 border-l-4 ${engineColorClass.replace('bg-', 'border-')} ${cardBgClass}`}
                            >
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${engineColorClass} flex-shrink-0 ring-2 ring-white dark:ring-gray-800`}></div>
                                        <h4 className={`font-semibold text-lg ${textHeaderClass}`}>
                                            {version.engineName} - Versione {version.versionIndex + 1}
                                        </h4>
                                        {isLatestVersionOfEngine && <span className="text-xs font-bold text-green-600 dark:text-green-400 p-1 bg-green-100 dark:bg-green-900 rounded-full px-2">ULTIMA</span>}
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                        {/* Bottone Dettaglio (visibile solo se esiste una versione precedente per confrontare) */}
                                        {previousVersion && (
                                            <button
                                                onClick={() => onShowDetails(version, previousVersion)} // Passa l'intera versione per consistenza
                                                className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow-md"
                                                title="Visualizza le modifiche dettagliate rispetto alla versione precedente"
                                            >
                                                Dettaglio
                                            </button>
                                        )}
                                        {/* Bottone Rollback (visibile solo se non è la versione iniziale e se è l'ultima) */}
                                        {version.versionIndex > 0 && isLatestVersionOfEngine && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Evita interazione involontaria
                                                    onDeleteVersion(version.engineId, version.engineName);
                                                }}
                                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow-md"
                                                title="Elimina questa versione e ripristina lo stato precedente (Rollback)"
                                            >
                                                Rollback
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <p className="text-sm text-gray-700 dark:text-gray-300 flex flex-wrap gap-x-4">
                                    <span className="font-medium">Creazione:</span> {new Date(version.timestamp).toLocaleString()} 
                                    {version.validityDate && (
                                        <span className="font-bold text-orange-600 dark:text-orange-400">| Valido da: {version.validityDate}</span>
                                    )}
                                </p>
                                
                                <ul className="list-disc list-inside text-sm text-gray-800 dark:text-gray-200 space-y-0.5 mt-2">
                                    {changes.slice(0, 5).map((change, i) => (
                                        <li key={i} className="truncate">{change}</li>
                                    ))}
                                    {changes.length > 5 && <li className="text-xs text-gray-500">...altre {changes.length - 5} modifiche. Apri il Dettaglio.</li>}
                                </ul>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const Timeline = ({ versions, onShowDetails, onDeleteVersion }) => {
    // Componente di cronologia deprecato, mantenuto solo per completezza ma non usato nel flusso principale
    return null;
};


const ChangeDetailsModal = ({ currentVersion, previousVersion, onClose }) => {
  if (!currentVersion || !previousVersion) return null;

  // Usa l'API completa per il dettaglio
  const changes = getDetailedChanges(currentVersion.data, previousVersion.data);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl text-gray-900 dark:text-gray-100">
        <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
          <h3 className="text-2xl font-bold">Dettaglio Modifiche</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Confronto tra Versione {previousVersion.versionIndex + 1} ({previousVersion.validityDate || new Date(previousVersion.timestamp).toLocaleDateString()}) e Versione {currentVersion.versionIndex + 1} ({currentVersion.validityDate || new Date(currentVersion.timestamp).toLocaleDateString()}).
        </p>
        <div className="space-y-6">
          {changes.length === 0 ? (
            <p className="text-center text-gray-500 p-8 border-2 border-dashed rounded-lg">Nessuna modifica strutturale o di contenuto rilevata.</p>
          ) : (
            changes.map((change, index) => (
              <div key={index} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner">
                <h4 className="font-bold text-xl mb-3">
                  <span className={`capitalize ${change.type === 'aggiunto' ? 'text-green-500' : change.type === 'rimosso' ? 'text-red-500' : 'text-orange-500'}`}>
                    {change.type}:
                  </span> {change.section} - <span className="text-gray-900 dark:text-gray-100">{change.name}</span>
                </h4>
                
                {change.type === 'modificato' && (
                  <div className="mt-2 space-y-2 text-sm border-t pt-2 dark:border-gray-600">
                    {Object.entries(change.changes).map(([field, diff]) => (
                      <div key={field} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-1 border-b border-gray-300 dark:border-gray-600 break-words">
                        <p className="font-medium col-span-1 text-blue-400">{field}:</p>
                        <div className="col-span-1">
                            <p className="text-red-400 text-xs">Prima:</p>
                            <p className="line-through">{diff.before}</p>
                        </div>
                        <div className="col-span-1">
                            <p className="text-green-400 text-xs">Dopo:</p>
                            <p>{diff.after}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(change.type === 'aggiunto' || change.type === 'rimosso') && (
                  <>
                    <p className="text-xs font-semibold mt-2">Dettagli Completi dell'Oggetto:</p>
                    <pre className="mt-2 p-2 bg-gray-200 dark:bg-gray-900 rounded text-xs overflow-x-auto max-h-48 whitespace-pre-wrap">{JSON.stringify(change.data, null, 2)}</pre>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Componente helper per la selezione del motore linkato
const LinkedEngineSelector = ({ allEngines, currentEngineId, engineType, index, entry, updateEntry, isEditing, onEngineJump }) => {
    // Filtra l'elenco dei motori per escludere il motore corrente per evitare cicli di dipendenza
    const selectableEngines = allEngines.filter(e => e.id !== currentEngineId);
    
    // Funzione per aggiornare l'entry con l'ID selezionato
    const handleSelectChange = (e) => {
        const newId = e.target.value === '' ? null : e.target.value;
        updateEntry(index, 'linkedEngineId', newId);
        // Se c'è un ID selezionato, disabilita il campo descrizione
        if (newId) {
            updateEntry(index, 'description', `Vedi dettagli in: ${allEngines.find(e => e.id === newId)?.name || 'Motore Collegato'}`);
        } else {
            // Se si rimuove il collegamento, pulisci la descrizione automatica
            const currentDesc = entry.description || '';
            if (currentDesc.startsWith('Vedi dettagli in:')) {
                updateEntry(index, 'description', '');
            }
        }
    };
    
    const linkedEngine = selectableEngines.find(e => e.id === entry.linkedEngineId);
    const setEngineType = engineType === 'statistical' ? 'setStatisticalEngines' : 'setExternalEngines';
    const isLinked = !!entry.linkedEngineId;

    return (
        <div className="flex flex-col space-y-2 mt-2">
            <div className="flex items-center gap-2">
                <label className="text-sm font-semibold flex-shrink-0">Collega Motore:</label>
                <select 
                    value={entry.linkedEngineId || ''} 
                    onChange={handleSelectChange} 
                    disabled={!isEditing}
                    className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">Nessun Collegamento</option>
                    {selectableEngines.map(engine => (
                        <option key={engine.id} value={engine.id}>{engine.name}</option>
                    ))}
                </select>
            </div>

            {isLinked && (
                <div className="flex justify-between items-center bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg">
                    <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        Collegato a: {linkedEngine?.name || 'Motore Sconosciuto'}
                    </p>
                    {isEditing && (
                        <button 
                            onClick={() => onEngineJump(entry.linkedEngineId)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow-md"
                        >
                            Vai/Modifica
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};


const EngineDetails = ({ engines, currentEngineId, statisticalEngines, setStatisticalEngines, externalEngines, setExternalEngines, universe, setUniverse, logicDetails, setLogicDetails, kpis, setKpis, documentation, setDocumentation, isEditing, addEntry, updateEntry, deleteEntry, onEngineJump }) => {
    
    // Funzione helper per l'aggiornamento dell'array in un EngineDetails
    const createArrayUpdater = (setter) => (index, key, value) => {
        setter(prev => {
            const newArray = [...prev];
            if(newArray[index]) {
                newArray[index] = { ...newArray[index], [key]: value };
            }
            return newArray;
        });
    };
    
    const updateStatisticalEngine = createArrayUpdater(setStatisticalEngines);
    const updateExternalEngine = createArrayUpdater(setExternalEngines);

    return (
    <div className="space-y-8 mt-8">
      {/* Sezione Universo di Applicazione - RESALTATA */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-t-4 border-blue-500">
        <h3 className="text-2xl font-bold text-blue-500 mb-4">1. Universo di Applicazione</h3>
        <textarea 
          value={universe.description || ''} 
          onChange={(e) => setUniverse({ description: e.target.value })} 
          disabled={!isEditing} 
          className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 h-24 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 resize-y"
          placeholder="Descrivi qui l'ambito di applicazione del motore..."
        ></textarea>
      </div>

      {/* Sezione Motore Statistico - RESALTATA */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-t-4 border-green-500">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-green-500">2. Motore Statistico</h3>
          {isEditing && <button onClick={() => addEntry(setStatisticalEngines, { name: '', description: '', linkedEngineId: null })} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-lg text-sm transition-colors shadow-md">+</button>}
        </div>
        <div className="space-y-4">
          {statisticalEngines.length === 0 && !isEditing ? <p className="text-gray-500 italic">Nessun motore statistico definito.</p> : statisticalEngines.map((engine, index) => {
              const isLinked = !!engine.linkedEngineId;
              return (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
                  
                  <LinkedEngineSelector
                    allEngines={engines}
                    currentEngineId={currentEngineId}
                    engineType="statistical"
                    index={index}
                    entry={engine}
                    updateEntry={updateStatisticalEngine}
                    isEditing={isEditing}
                    onEngineJump={onEngineJump}
                  />

                  <label className="block text-sm font-semibold mb-1 mt-2">Nome</label>
                  <input type="text" value={engine.name} onChange={(e) => updateEntry(setStatisticalEngines, index, 'name', e.target.value)} disabled={!isEditing || isLinked} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 focus:ring-green-500 focus:border-green-500" placeholder="Nome Motore" />
                  
                  <label className="block text-sm font-semibold mt-2 mb-1">Dettagli</label>
                  <textarea value={engine.description} onChange={(e) => updateEntry(setStatisticalEngines, index, 'description', e.target.value)} disabled={!isEditing || isLinked} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-24 focus:ring-green-500 focus:border-green-500 resize-y" placeholder={isLinked ? "Dettagli gestiti dal motore collegato" : "Descrizione o specifiche"}></textarea>
                  
                  {isEditing && <button onClick={() => deleteEntry(setStatisticalEngines, index)} className="mt-2 text-red-500 text-sm hover:underline">Rimuovi</button>}
                </div>
              );
          })}
        </div>
      </div>

      {/* Sezione Altri Motori Esterni - RESALTATA */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-t-4 border-yellow-500">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-yellow-500">3. Altri Motori Esterni</h3>
          {isEditing && <button onClick={() => addEntry(setExternalEngines, { name: '', description: '', linkedEngineId: null })} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg text-sm transition-colors shadow-md">+</button>}
        </div>
        <div className="space-y-4">
          {externalEngines.length === 0 && !isEditing ? <p className="text-gray-500 italic">Nessun motore esterno definito.</p> : externalEngines.map((engine, index) => {
              const isLinked = !!engine.linkedEngineId;
              return (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
                  
                   <LinkedEngineSelector
                    allEngines={engines}
                    currentEngineId={currentEngineId}
                    engineType="external"
                    index={index}
                    entry={engine}
                    updateEntry={updateExternalEngine}
                    isEditing={isEditing}
                    onEngineJump={onEngineJump}
                  />

                  <label className="block text-sm font-semibold mb-1 mt-2">Nome</label>
                  <input type="text" value={engine.name} onChange={(e) => updateEntry(setExternalEngines, index, 'name', e.target.value)} disabled={!isEditing || isLinked} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 focus:ring-yellow-500 focus:border-yellow-500" placeholder="Nome Motore" />
                  
                  <label className="block text-sm font-semibold mt-2 mb-1">Dettagli</label>
                  <textarea value={engine.description} onChange={(e) => updateEntry(setExternalEngines, index, 'description', e.target.value)} disabled={!isEditing || isLinked} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-24 focus:ring-yellow-500 focus:border-yellow-500 resize-y" placeholder={isLinked ? "Dettagli gestiti dal motore collegato" : "Descrizione o specifiche"}></textarea>
                  
                  {isEditing && <button onClick={() => deleteEntry(setExternalEngines, index)} className="mt-2 text-red-500 text-sm hover:underline">Rimuovi</button>}
                </div>
              );
          })}
        </div>
      </div>

      {/* Sezione Logiche del Motore - RESALTATA */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-t-4 border-red-500">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-red-500">4. Logiche del Motore</h3>
          {isEditing && <button onClick={() => addEntry(setLogicDetails, { name: '', description: '' })} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg text-sm transition-colors shadow-md">+</button>}
        </div>
        <div className="space-y-4">
          {logicDetails.length === 0 && !isEditing ? <p className="text-gray-500 italic">Nessuna logica definita.</p> : logicDetails.map((logic, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
              <label className="block text-sm font-semibold mb-1">Nome Logica</label>
              <input type="text" value={logic.name} onChange={(e) => updateEntry(setLogicDetails, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 focus:ring-red-500 focus:border-red-500" placeholder="Nome Logica" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettaglio</label>
              <textarea value={logic.description} onChange={(e) => updateEntry(setLogicDetails, index, 'description', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-24 focus:ring-red-500 focus:border-red-500 resize-y" placeholder="Descrizione del funzionamento"></textarea>
              {isEditing && <button onClick={() => deleteEntry(setLogicDetails, index)} className="mt-2 text-red-500 text-sm hover:underline">Rimuovi</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Sezione Impatto - RESALTATA */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-t-4 border-purple-500">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-purple-500">5. Impatto (KPI)</h3>
          {isEditing && <button onClick={() => addEntry(setKpis, { name: '', calculation: '', impact: '' })} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-3 rounded-lg text-sm transition-colors shadow-md">+</button>}
        </div>
        <div className="space-y-4">
          {kpis.length === 0 && !isEditing ? <p className="text-gray-500 italic">Nessun KPI definito.</p> : kpis.map((kpi, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
              <label className="block text-sm font-semibold mb-1">Nome KPI</label>
              <input type="text" value={kpi.name} onChange={(e) => updateEntry(setKpis, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 focus:ring-purple-500 focus:border-purple-500" placeholder="Nome KPI" />
              <label className="block text-sm font-semibold mt-2 mb-1">Dettaglio Calcolo</label>
              <textarea value={kpi.calculation} onChange={(e) => updateEntry(setKpis, index, 'calculation', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-16 focus:ring-purple-500 focus:border-purple-500 resize-y" placeholder="Formula o Metodologia"></textarea>
              <label className="block text-sm font-semibold mt-2 mb-1">Impatto</label>
              <textarea value={kpi.impact} onChange={(e) => updateEntry(setKpis, index, 'impact', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-16 focus:ring-purple-500 focus:border-purple-500 resize-y" placeholder="Impatto sul business"></textarea>
              {isEditing && <button onClick={() => deleteEntry(setKpis, index)} className="mt-2 text-red-500 text-sm hover:underline">Rimuovi</button>}
            </div>
          ))}
        </div>
      </div>
      
      {/* Sezione Documentazione - NUOVA SEZIONE RESALTATA */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-t-4 border-indigo-500">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-indigo-500">6. Documentazione</h3>
          {isEditing && <button onClick={() => addEntry(setDocumentation, { name: '', url: '' })} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-3 rounded-lg text-sm transition-colors shadow-md">+</button>}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Aggiungi link a documenti o specifiche. Nota: l'accesso ai file locali è bloccato dai browser.</p>
        <div className="space-y-4">
          {documentation.length === 0 && !isEditing ? <p className="text-gray-500 italic">Nessun documento collegato.</p> : documentation.map((doc, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
              <label className="block text-sm font-semibold mb-1">Nome Documento</label>
              <input type="text" value={doc.name} onChange={(e) => updateEntry(setDocumentation, index, 'name', e.target.value)} disabled={!isEditing} className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Nome del documento" />
              <label className="block text-sm font-semibold mt-2 mb-1">Link / URL</label>
              <div className="flex items-center gap-2">
                  {/* Usa un placeholder per URL vuoti per evitare avvisi nel campo di input */}
                  <input 
                      type="text" 
                      value={doc.url} 
                      onChange={(e) => updateEntry(setDocumentation, index, 'url', e.target.value)} 
                      disabled={!isEditing} 
                      className="w-full p-1 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500" 
                      placeholder="https://esempio.com/documento.pdf"
                  />
                  {doc.url && (
                    <a href={doc.url.startsWith('http') ? doc.url : `http://${doc.url}`} target="_blank" rel="noopener noreferrer" className="bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-3 rounded-lg text-sm flex-shrink-0 transition-colors shadow-sm" title="Apri Link">Apri</a>
                  )}
              </div>
              {isEditing && <button onClick={() => deleteEntry(setDocumentation, index)} className="mt-2 text-red-500 text-sm hover:underline">Rimuovi</button>}
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
  // Nuovo stato per la gestione del drag and drop
  const [isDragging, setIsDragging] = useState(false); 

  // Stati del form
  const [newEngineName, setNewEngineName] = useState('');
  const [newEngineDesc, setNewEngineDesc] = useState('');
  const [statisticalEngines, setStatisticalEngines] = useState([]);
  const [externalEngines, setExternalEngines] = useState([]);
  const [universe, setUniverse] = useState({});
  const [logicDetails, setLogicDetails] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [documentation, setDocumentation] = useState([]);
  const [changeValidityDate, setChangeValidityDate] = useState('');

  // Stati del modale e della vista
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [changeDetails, setChangeDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [engineToDeleteId, setEngineToDeleteId] = useState(null);
  const [engineToDeleteName, setEngineToDeleteName] = useState(null); 
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(null); 
  const [showErrorMessage, setShowErrorMessage] = useState(null);

  const resetFormState = () => {
    setNewEngineName('');
    setNewEngineDesc('');
    setStatisticalEngines([]);
    setExternalEngines([]);
    setUniverse({});
    setLogicDetails([]);
    setKpis([]);
    setDocumentation([]);
    setChangeValidityDate('');
  };
  
  const showTemporaryMessage = (message, type = 'success') => {
      // Pulisce i messaggi precedenti
      setShowConfirmationMessage(null);
      setShowErrorMessage(null);

      if (type === 'success') {
          setShowConfirmationMessage(message);
          setTimeout(() => setShowConfirmationMessage(null), 5000);
      } else if (type === 'error') {
          setShowErrorMessage(message);
          setTimeout(() => setShowErrorMessage(null), 8000);
      }
  };

  const loadEngineData = (engine) => {
    const latestVersion = engine.versions[engine.versions.length - 1];
    if (latestVersion && latestVersion.data) {
      // Inizializza gli stati con fallback ad array vuoti per sicurezza e retrocompatibilità
      setStatisticalEngines(latestVersion.data.statisticalEngines || []);
      setExternalEngines(latestVersion.data.externalEngines || []);
      setUniverse(latestVersion.data.universe || {});
      setLogicDetails(latestVersion.data.logicDetails || []);
      setKpis(latestVersion.data.kpis || []);
      setDocumentation(latestVersion.data.documentation || []); // <-- Retrocompatibilità: se non esiste, usa []
    } else {
        // Se non ci sono versioni, resetta i dati a vuoto
        setStatisticalEngines([]);
        setExternalEngines([]);
        setUniverse({});
        setLogicDetails([]);
        setKpis([]);
        setDocumentation([]);
    }
  };

  const handleSelectEngine = (engine, startEditing = false) => {
    setSelectedEngine(engine);
    if (engine) {
        setIsCreating(false);
        loadEngineData(engine);
        setIsEditing(startEditing); // Imposta la modalità di modifica se richiesto
    }
  };
  
  // Funzione per navigare ad un altro motore e attivare la modifica
  const handleEngineJump = (engineId) => {
    const engineToJump = engines.find(e => e.id === engineId);
    if (engineToJump) {
        handleSelectEngine(engineToJump, true); // Seleziona e attiva la modifica
        showTemporaryMessage(`Passato al motore collegato: ${engineToJump.name}`, 'success');
    } else {
        showTemporaryMessage("Errore: Motore collegato non trovato.", 'error');
    }
  }


  const handleCreateEngine = () => {
    if (!newEngineName) {
        showTemporaryMessage("Il nome del motore non può essere vuoto.", 'error');
        return;
    }
    
    // Controlla che i dati del form siano validi
    const initialData = {
        statisticalEngines: statisticalEngines || [],
        externalEngines: externalEngines || [],
        logicDetails: logicDetails || [],
        universe: universe || {},
        kpis: kpis || [],
        documentation: documentation || [],
    };
    
    const newEngine = {
      id: crypto.randomUUID(),
      name: newEngineName,
      description: newEngineDesc,
      versions: [{
        versionId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: initialData,
        // La prima versione non ha data di validità a meno che non sia stata impostata nel form di creazione
        validityDate: changeValidityDate || undefined, 
      }],
    };
    
    setEngines(prevEngines => [...prevEngines, newEngine]);
    resetFormState();
    setIsCreating(false);
    setSelectedEngine(newEngine); // Seleziona il motore appena creato
    
    showTemporaryMessage(`Motore '${newEngine.name}' creato con successo!`);
    handleExport(); 
  };

  const handleUpdateEngine = (trackChanges) => {
    if (!selectedEngine) return;

    const currentEngine = engines.find(e => e.id === selectedEngine.id);
    // Controllo aggiunto per motori con versione vuota, sebbene la validazione dovrebbe prevenirlo
    if (!currentEngine || currentEngine.versions.length === 0) {
        showTemporaryMessage("Errore: Impossibile aggiornare un motore senza versioni.", 'error');
        return;
    }

    const lastVersionTimestamp = currentEngine.versions[currentEngine.versions.length - 1].timestamp;
    const lastVersionDate = new Date(lastVersionTimestamp).toISOString().split('T')[0];

    // 1. Validazione della Data di validità (solo se trackChanges è true)
    if (trackChanges && changeValidityDate) {
        const validityDate = new Date(changeValidityDate);
        const lastModDate = new Date(lastVersionTimestamp);
        
        // Confronto solo per la data
        const validityDay = new Date(validityDate.toDateString());
        const lastModDay = new Date(lastModDate.toDateString());

        if (validityDay <= lastModDay) {
            showTemporaryMessage(`La data di validità (${changeValidityDate}) deve essere SUCCESSIVA all'ultima data di modifica/validità registrata (${lastVersionDate}).`, 'error');
            return;
        }
    }
    
    const newEngineData = {
        statisticalEngines,
        externalEngines,
        logicDetails,
        universe,
        kpis,
        documentation,
    };

    let newSelectedEngine = null; // Per aggiornare lo stato selectedEngine dopo il setEngines

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
        newSelectedEngine = { ...engine, versions: updatedVersions };
        return newSelectedEngine;
      }
      return engine;
    }));
    
    setIsEditing(false);
    setChangeValidityDate(''); // Reset della data dopo il salvataggio
    
    // Ricarica i dati corretti dopo l'aggiornamento dello stato (necessario perché setEngines è asincrono)
    if (newSelectedEngine) {
        loadEngineData(newSelectedEngine);
    }
    
    showTemporaryMessage("Modifiche salvate con successo. Backup JSON generato.");
    handleExport();
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
    let newSelectedEngine = null;
    
    if (isDeletingVersion) {
      setEngines(prevEngines => prevEngines.map(engine => {
        if (engine.id === engineToDeleteId) {
          if (engine.versions.length > 1) {
              deletedEngineName = engine.name;
              const newVersions = engine.versions.slice(0, -1);
              
              if (selectedEngine && selectedEngine.id === engineToDeleteId) {
                  // Prepara i dati della nuova ultima versione per ricaricare
                  newSelectedEngine = { ...engine, versions: newVersions };
              }
              return { ...engine, versions: newVersions };
          } else {
            // Se stiamo per eliminare l'unica versione, il motore viene rimosso
            // L'eliminazione completa è gestita dal .filter successivo
            deletedEngineName = engine.name;
          }
        }
        return engine;
      }).filter(engine => engine.versions.length > 0)); // Rimuove motori senza versioni

      if (deletedEngineName) {
        showTemporaryMessage(`OK! L'ultima versione di '${engineToDeleteName}' è stata eliminata. Rollback completato.`);
      }
      
      // Aggiorna lo stato selezionato
      if (newSelectedEngine) {
          loadEngineData(newSelectedEngine);
      } else {
          // Se il motore è stato rimosso (aveva solo 1 versione) o non era selezionato
          // Dobbiamo re-filtrare engines per trovare la versione aggiornata
          setEngines(currentEngines => {
            const updatedEngineList = currentEngines.filter(engine => engine.versions.length > 0);
            const remainingEngine = updatedEngineList.find(e => e.id === engineToDeleteId);
            if (!remainingEngine) {
                setSelectedEngine(null);
            }
            return updatedEngineList;
          });
      }
      
    } else {
      // Eliminazione completa del motore
      const engineName = engines.find(e => e.id === engineToDeleteId)?.name || 'Motore Sconosciuto';
      setEngines(prevEngines => prevEngines.filter(engine => engine.id !== engineToDeleteId));
      setSelectedEngine(null);

      showTemporaryMessage(`OK! Il motore '${engineName}' è stato eliminato definitivamente.`);
    }

    // Reset degli stati del modale
    setShowDeleteConfirm(false);
    setEngineToDeleteId(null);
    setEngineToDeleteName(null);
    setIsDeletingVersion(false);

    handleExport();
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

  // Gestisce l'importazione sia da input file che da drag and drop
  const processImportedFile = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedEngines = JSON.parse(e.target.result);
        
        // ** PASSAGGIO CRITICO: Validazione Strutturale **
        if (!validateImportedEngines(importedEngines)) {
            showTemporaryMessage("Errore: Il file JSON non ha la struttura attesa per i motori (Engine ID, Nome, e array Versions con dati). Importazione annullata.", 'error');
            return;
        }

        setEngines(importedEngines);
        // Deseleziona l'engine corrente dopo l'import
        setSelectedEngine(null); 
        resetFormState();
        showTemporaryMessage(`Importazione JSON completata con successo da ${file.name}!`);
      } catch (error) {
        showTemporaryMessage("Errore durante la lettura o il parsing del file JSON. Assicurati che sia un JSON valido.", 'error');
        console.error("Error importing file: ", error);
      }
    };
    reader.readAsText(file);
  }
  
  // Funzione di Import RESILIENTE (FIX)
  const handleImport = (event) => {
    const file = event.target.files[0];
    processImportedFile(file);
    // Azzera il valore dell'input file per permettere re-importazioni dello stesso file
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const handleImportButtonClick = () => {
    fileInput.click();
  };
  
  // LOGICA DRAG AND DROP
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // Prendiamo solo il primo file
        const file = e.dataTransfer.files[0];
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
            processImportedFile(file);
        } else {
            showTemporaryMessage(`Tipo di file non supportato. Trascina solo file .json.`, 'error');
        }
        e.dataTransfer.clearData();
    }
  };


  // Passa l'intera versione (currentVersion, previousVersion)
  const handleViewDetails = (currentVersion, previousVersion) => {
    if (!previousVersion) return; 
    setChangeDetails({ currentVersion, previousVersion });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setChangeDetails(null);
  };

  // Funzioni di supporto per dati basati su array
  // MODIFICATO: Inserisce il nuovo elemento in testa all'array per coerenza con la UI
  const addEntry = (setter, emptyEntry) => setter(prev => [emptyEntry, ...prev]);
  
  const updateEntry = (setter, index, key, value) => {
    setter(prev => {
      const newArray = [...prev];
      if(newArray[index]) { // Controllo per prevenire errori se l'indice è fuori range
          newArray[index] = { ...newArray[index], [key]: value };
      }
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
        .animate-bounce { animation: bounce 0.5s ease-in-out; }
        @keyframes bounce { 0%, 100% { transform: translateY(-5%); } 50% { transform: translateY(0); } }
      `}</style>

      {/* MODALE DI CONFERMA ELIMINAZIONE/ROLLBACK */}
      {showDeleteConfirm && (
        <DeleteConfirmModal 
          onConfirm={handleConfirmDelete} 
          onCancel={handleCancelDelete} 
          message={deleteMessage}
        />
      )}
      
      {/* MESSAGGIO DI CONFERMA/ERRORE */}
      {showConfirmationMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-xl z-50 transition-all duration-300">
            {showConfirmationMessage}
        </div>
      )}
      
      {showErrorMessage && (
        <div className="fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-xl z-50 transition-all duration-300">
            {showErrorMessage}
        </div>
      )}


      <div 
        className={`lg:w-1/4 w-full p-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] 
        transition-all duration-300 ${isDragging ? 'ring-4 ring-dashed ring-blue-500 bg-blue-50 dark:bg-blue-900/50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-10 dark:bg-opacity-30 rounded-xl z-40 pointer-events-none">
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">Rilascia qui il file JSON per l'Importazione</p>
            </div>
        )}
        <h2 className="text-2xl font-bold mb-4 border-b pb-2 dark:border-gray-700">Gestione Motori</h2>
        <div className="flex flex-col space-y-2 mb-4">
          <button
            onClick={() => {
              setIsCreating(true);
              setSelectedEngine(null);
              resetFormState();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Crea Nuovo Motore
          </button>
          <button
            onClick={handleImportButtonClick}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Importa da JSON (o trascina qui)
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
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Esporta in JSON
          </button>
        </div>
        <h3 className="text-xl font-semibold mb-2">Lista Motori ({engines.length})</h3>
        <ul className="space-y-2 overflow-y-auto pr-2 flex-grow">
          {engines.length === 0 ? (
              <p className="text-gray-500 italic p-4 text-center">Nessun motore trovato. Inizia creando o importando!</p>
          ) : (
              engines.map(engine => (
                <li key={engine.id}>
                  <div
                    className={`p-3 rounded-lg cursor-pointer transition-colors border-2 ${selectedEngine && selectedEngine.id === engine.id ? 'border-blue-500 bg-blue-100 dark:bg-blue-900 shadow-md' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    onClick={() => handleSelectEngine(engine)}
                    onDoubleClick={() => {
                        handleSelectEngine(engine, true); // Avvia la modifica al doppio click
                    }}
                  >
                    <div className="font-semibold">{engine.name}</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{engine.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Versioni: {engine.versions.length}</p>
                  </div>
                </li>
              ))
          )}
        </ul>
      </div>

      <div className="flex-1 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {selectedEngine || isCreating ? (
          <div>
            <div className="flex flex-wrap justify-between items-center mb-6 border-b pb-4 dark:border-gray-700">
              <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">{isCreating ? 'Nuovo Motore' : selectedEngine.name}</h2>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                  {/* PULSANTE AGGIORNATO */}
                  {(isEditing || isCreating) && (
                      <button
                          onClick={() => {
                              setIsEditing(false);
                              setIsCreating(false);
                              // Se selezionato, ricarica i dati per garantire coerenza se l'utente annulla
                              if (selectedEngine) {
                                  loadEngineData(selectedEngine);
                              } else {
                                  resetFormState();
                              }
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm shadow-md"
                      >
                          Visualizza Cronologia
                      </button>
                  )}
                  {/* PULSANTI DI GESTIONE MOTORE */}
                  {selectedEngine && !isCreating && (
                      <button
                          onClick={() => handleDeleteEngineConfirm(selectedEngine.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm shadow-md"
                      >
                          Elimina Motore
                      </button>
                  )}
              </div>
            </div>

            {/* Campi Nome e Descrizione per la creazione */}
            {isCreating && (
                <div className="space-y-4 mb-8 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg border-l-4 border-blue-500">
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2">Nome Motore (Obbligatorio)</label>
                        <input
                            type="text"
                            value={newEngineName}
                            onChange={(e) => setNewEngineName(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2">Descrizione Breve</label>
                        <textarea
                            value={newEngineDesc}
                            onChange={(e) => setNewEngineDesc(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 h-16 focus:ring-blue-500 focus:border-blue-500 resize-y"
                        />
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2">Data di validità iniziale (Opzionale)</label>
                        <input
                            type="date"
                            value={changeValidityDate}
                            onChange={(e) => setChangeValidityDate(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600"
                        />
                    </div>
                    <button
                        onClick={handleCreateEngine}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg"
                        disabled={!newEngineName}
                    >
                        Crea e Salva
                    </button>
                </div>
            )}
            
            {/* Sezione Modifica/Salvataggio */}
            {isEditing && (
              <div className="space-y-4 mb-8 p-4 border border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-inner">
                <h3 className="text-xl font-bold text-blue-500">Opzioni di Salvataggio</h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Data di validità della modifica (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={changeValidityDate}
                    onChange={(e) => setChangeValidityDate(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                      Se specificata e successiva, crea una nuova versione (Tracciamento). Altrimenti, salva come sovrascrittura.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => handleUpdateEngine(!!changeValidityDate)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md text-sm flex-1 min-w-[200px]">
                      Salva e {!changeValidityDate ? 'Sovrascrivi Ultima' : 'Crea Nuova Versione'}
                  </button>
                  <button onClick={() => handleUpdateEngine(false)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md text-sm flex-1 min-w-[200px]">
                      Sovrascrivi Ultima Versione (Ignora Data)
                  </button>
                  <button onClick={() => {
                    setIsEditing(false);
                    loadEngineData(selectedEngine); // Annulla ripristinando l'ultima versione
                  }} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md text-sm flex-1 min-w-[100px]">Annulla</button>
                </div>
              </div>
            )}
            <EngineDetails
              engines={engines}
              currentEngineId={selectedEngine?.id} // Passa l'ID del motore corrente
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
              documentation={documentation}
              setDocumentation={setDocumentation}
              isEditing={isEditing || isCreating}
              addEntry={addEntry}
              updateEntry={updateEntry}
              deleteEntry={deleteEntry}
              onEngineJump={handleEngineJump} // Passa la nuova funzione di salto
            />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4 border-b pb-4 dark:border-gray-700">
               <h2 className="text-3xl font-extrabold">Visualizzazione Cronologia</h2>
               <div className="space-x-2">
                    {engines.length > 0 && (
                        <button
                            onClick={() => {
                                // Se nessun motore è selezionato, selezioniamo il primo per iniziare la modifica
                                if (!selectedEngine && engines.length > 0) {
                                    handleSelectEngine(engines[0], true);
                                } else if (selectedEngine) {
                                    setIsEditing(true);
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg"
                        >
                            Modifica Engine
                        </button>
                    )}
               </div>
            </div>
            {engines.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 p-16">Seleziona o crea un motore sulla sinistra per visualizzare i dettagli e la cronologia.</p>
            ) : (
                <AllEnginesTimeline 
                    engines={engines} 
                    onShowDetails={handleViewDetails} 
                    onDeleteVersion={handleDeleteVersionConfirm} 
                />
            )}
          </div>
        )}
      </div>
      {isModalOpen && changeDetails && (
        <ChangeDetailsModal 
            currentVersion={changeDetails.currentVersion} 
            previousVersion={changeDetails.previousVersion} 
            onClose={closeModal} 
        />
      )}
    </div>
  );
};

export default App;
