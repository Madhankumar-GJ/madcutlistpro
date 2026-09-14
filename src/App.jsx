import React, { useState } from 'react';
import { 
  Scissors, LayoutDashboard, Boxes, FileSpreadsheet, Settings, 
  Printer, Plus, Trash2, Play, RefreshCw, 
  Layers, QrCode, FileText, Download, Upload, Edit2, X
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Stock / Raw Materials
  const [stocks, setStocks] = useState([
    { id: 1, name: 'Plywood 18mm Standard', length: 2440, width: 1220, thickness: 18, quantity: 10, cost: 45.0 },
    { id: 2, name: 'MDF 8mm Backing', length: 2440, width: 1220, thickness: 8, quantity: 5, cost: 25.0 }
  ]);

  // Parts List with default thickness 18mm
  const [parts, setParts] = useState([
    { id: 1, name: 'Cabinet Left Side', length: 720, width: 560, thickness: 18, quantity: 2, grain: true, edgeBanding: { top: true, bottom: true, left: false, right: true } },
    { id: 2, name: 'Cabinet Right Side', length: 720, width: 560, thickness: 18, quantity: 2, grain: true, edgeBanding: { top: true, bottom: true, left: false, right: true } },
    { id: 3, name: 'Small Spacer Strip', length: 200, width: 100, thickness: 18, quantity: 6, grain: false, edgeBanding: { top: false, bottom: false, left: false, right: false } },
  ]);

  // Edit State for Parts
  const [editingPartId, setEditingPartId] = useState(null);
  const [editPartData, setEditPartData] = useState({ name: '', length: '', width: '', thickness: 18, quantity: 1, grain: false, edgeBanding: { top: false, bottom: false, left: false, right: false } });

  // Settings with 2mm default edgeband thickness and 4-side trim
  const [settings, setSettings] = useState({
    kerf: 4,               
    trimTop: 10,              
    trimBottom: 10,              
    trimLeft: 10,              
    trimRight: 10,              
    edgeBandThickness: 2   
  });

  // Print Report Selection
  const [printOptions, setPrintOptions] = useState({
    partsList: true,
    layouts: true,
    labels: true
  });

  // Optimization Results
  const [results, setResults] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Handlers for Stock
  const [newStock, setNewStock] = useState({ name: '', length: '', width: '', thickness: '', quantity: '', cost: '' });
  const handleAddStock = (e) => {
    e.preventDefault();
    if (!newStock.name || !newStock.length || !newStock.width) return;
    setStocks([...stocks, { id: Date.now(), ...newStock, length: Number(newStock.length), width: Number(newStock.width), thickness: Number(newStock.thickness) || 18, quantity: Number(newStock.quantity), cost: Number(newStock.cost) }]);
    setNewStock({ name: '', length: '', width: '', thickness: '', quantity: '', cost: '' });
  };

  // Handlers for Parts
  const [newPart, setNewPart] = useState({ 
    name: '', length: '', width: '', thickness: 18, quantity: 1, grain: false, 
    edgeBanding: { top: false, bottom: false, left: false, right: false } 
  });

  const handleAddPart = (e) => {
    e.preventDefault();
    if (!newPart.name || !newPart.length || !newPart.width) return;
    setParts([...parts, { 
      id: Date.now(), 
      ...newPart, 
      length: Number(newPart.length), 
      width: Number(newPart.width), 
      thickness: Number(newPart.thickness) || 18,
      quantity: Number(newPart.quantity) 
    }]);
    setNewPart({ name: '', length: '', width: '', thickness: 18, quantity: 1, grain: false, edgeBanding: { top: false, bottom: false, left: false, right: false } });
  };

  // Start Editing Part
  const startEditingPart = (p) => {
    setEditingPartId(p.id);
    setEditPartData({
      name: p.name,
      length: p.length,
      width: p.width,
      thickness: p.thickness ?? 18,
      quantity: p.quantity,
      grain: p.grain,
      edgeBanding: { ...p.edgeBanding }
    });
  };

  // Save Edited Part
  const handleSaveEditPart = (e) => {
    e.preventDefault();
    setParts(parts.map(p => p.id === editingPartId ? {
      ...p,
      name: editPartData.name,
      length: editPartData.length === '' ? '' : Number(editPartData.length),
      width: editPartData.width === '' ? '' : Number(editPartData.width),
      thickness: editPartData.thickness === '' ? '' : Number(editPartData.thickness),
      quantity: editPartData.quantity === '' ? '' : Number(editPartData.quantity),
      grain: editPartData.grain,
      edgeBanding: editPartData.edgeBanding
    } : p));
    setEditingPartId(null);
  };

  // Smart Flexible CSV / Tab-delimited File Importer with Column Mapping
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0) {
          alert('The uploaded file is empty.');
          return;
        }

        // Determine delimiter (comma, tab, or semicolon)
        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes('\t')) delimiter = '\t';
        else if (firstLine.includes(';')) delimiter = ';';

        const parseRow = (rowStr) => {
          const result = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < rowStr.length; i++) {
            const char = rowStr[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              result.push(cur.trim().replace(/^"|"$/g, ''));
              cur = '';
            } else {
              cur += char;
            }
          }
          result.push(cur.trim().replace(/^"|"$/g, ''));
          return result;
        };

        const headers = parseRow(lines[0]).map(h => h.toLowerCase());
        
        // Find column indices dynamically based on header names or fall back to safe indices
        const findColIndex = (keywords) => {
          for (let kw of keywords) {
            const idx = headers.findIndex(h => h.includes(kw));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const nameIdx = findColIndex(['name', 'part', 'description', 'title']);
        const lenIdx = findColIndex(['length', 'len', 'l']);
        const widthIdx = findColIndex(['width', 'wid', 'w']);
        const thkIdx = findColIndex(['thick', 'thk', 't']);
        const qtyIdx = findColIndex(['qty', 'quantity', 'count', 'q']);

        const parsedParts = [];
        const startRow = (nameIdx !== -1 || lenIdx !== -1) ? 1 : 0; // If headers found, skip row 0

        for (let i = startRow; i < lines.length; i++) {
          const cols = parseRow(lines[i]);
          if (cols.length === 0 || cols.every(c => c === '')) continue;

          // Map values or set blank/defaults if missing
          const pName = nameIdx !== -1 && cols[nameIdx] !== undefined ? cols[nameIdx] : (cols[0] || `Imported Part ${i}`);
          const pLen = lenIdx !== -1 && cols[lenIdx] !== undefined && cols[lenIdx] !== '' ? Number(cols[lenIdx]) : (cols[1] !== undefined && !isNaN(Number(cols[1])) ? Number(cols[1]) : '');
          const pWidth = widthIdx !== -1 && cols[widthIdx] !== undefined && cols[widthIdx] !== '' ? Number(cols[widthIdx]) : (cols[2] !== undefined && !isNaN(Number(cols[2])) ? Number(cols[2]) : '');
          const pThk = thkIdx !== -1 && cols[thkIdx] !== undefined && cols[thkIdx] !== '' ? Number(cols[thkIdx]) : 18;
          const pQty = qtyIdx !== -1 && cols[qtyIdx] !== undefined && cols[qtyIdx] !== '' ? Number(cols[qtyIdx]) : 1;

          parsedParts.push({
            id: Date.now() + i,
            name: pName,
            length: pLen,
            width: pWidth,
            thickness: pThk,
            quantity: pQty,
            grain: false,
            edgeBanding: { top: false, bottom: false, left: false, right: false }
          });
        }

        if (parsedParts.length > 0) {
          setParts(prev => [...prev, ...parsedParts]);
          alert(`Successfully imported ${parsedParts.length} parts! Missing fields were left blank or set to defaults and remain fully editable.`);
        } else {
          alert('No valid parts found in the file.');
        }
      } catch (err) {
        alert('Error parsing file. Please check format.');
      }
    };
    reader.readAsText(file);
  };

  // Optimization Engine with sequential numerical IDs (1, 2, 3...)
  const runOptimization = () => {
    // Filter out incomplete parts with missing dimensions
    const validParts = parts.filter(p => p.length > 0 && p.width > 0 && p.quantity > 0);
    if (validParts.length === 0) {
      alert('Please ensure all parts have valid numeric Length, Width, and Quantity before optimizing.');
      return;
    }

    setIsOptimizing(true);
    setTimeout(() => {
      let expandedParts = [];
      let globalIndex = 1;
      
      validParts.forEach((p) => {
        for (let i = 0; i < p.quantity; i++) {
          let effL = p.length;
          let effW = p.width;
          if (p.edgeBanding.top) effL -= settings.edgeBandThickness;
          if (p.edgeBanding.bottom) effL -= settings.edgeBandThickness;
          if (p.edgeBanding.left) effW -= settings.edgeBandThickness;
          if (p.edgeBanding.right) effW -= settings.edgeBandThickness;

          expandedParts.push({
            id: globalIndex++, // Sequential numerical numbering 1, 2, 3...
            name: p.name,
            length: effL, 
            width: effW, 
            origLength: p.length, 
            origWidth: p.width,
            thickness: p.thickness || 18,   
            quantity: p.quantity, 
            grain: p.grain,
            edgeBanding: p.edgeBanding
          });
        }
      });

      expandedParts.sort((a, b) => (b.length * b.width) - (a.length * a.width));

      const stockItem = stocks[0] || { length: 2440, width: 1220 };
      let sheets = [];
      let unplaced = [...expandedParts];

      const usableL = stockItem.length - (settings.trimLeft + settings.trimRight);
      const usableW = stockItem.width - (settings.trimTop + settings.trimBottom);

      while (unplaced.length > 0) {
        let currentSheet = {
          id: sheets.length + 1,
          length: usableL,
          width: usableW,
          thickness: stockItem.thickness || 18,
          placedParts: [],
          freeRects: [{ x: settings.trimLeft, y: settings.trimTop, w: usableL, h: usableW }]
        };

        let stillUnplaced = [];
        
        unplaced.forEach(part => {
          let placed = false;
          for (let i = 0; i < currentSheet.freeRects.length; i++) {
            let fr = currentSheet.freeRects[i];
            let fitsNormal = part.length <= fr.w && part.width <= fr.h;
            let fitsRotated = !part.grain && part.width <= fr.w && part.length <= fr.h;

            if (fitsNormal || fitsRotated) {
              let useRotated = !fitsNormal && fitsRotated;
              let pW = useRotated ? part.width : part.length;
              let pH = useRotated ? part.length : part.width;
              let pOrigW = useRotated ? part.origWidth : part.origLength;
              let pOrigH = useRotated ? part.origLength : part.origWidth;
              let pEB = useRotated ? { top: part.edgeBanding.left, bottom: part.edgeBanding.right, left: part.edgeBanding.top, right: part.edgeBanding.bottom } : part.edgeBanding;

              currentSheet.placedParts.push({
                ...part,
                x: fr.x,
                y: fr.y,
                w: pW,
                h: pH,
                origW: pOrigW,
                origH: pOrigH,
                currentEB: pEB,
                rotated: useRotated
              });

              currentSheet.freeRects.splice(i, 1);
              if (fr.w - pW > settings.kerf) {
                currentSheet.freeRects.push({ x: fr.x + pW + settings.kerf, y: fr.y, w: fr.w - pW - settings.kerf, h: pH });
              }
              if (fr.h - pH > settings.kerf) {
                currentSheet.freeRects.push({ x: fr.x, y: fr.y + pH + settings.kerf, w: fr.w, h: fr.h - pH - settings.kerf });
              }

              placed = true;
              break;
            }
          }
          if (!placed) stillUnplaced.push(part);
        });

        sheets.push(currentSheet);
        unplaced = stillUnplaced;
        if (sheets.length > 20) break;
      }

      let totalArea = sheets.length * stockItem.length * stockItem.width;
      let usedArea = expandedParts.reduce((acc, p) => acc + (p.length * p.width), 0);
      let wastePercentage = Math.max(0, 100 - ((usedArea / totalArea) * 100)).toFixed(1);

      setResults({
        sheets,
        totalSheets: sheets.length,
        wastePercentage,
        expandedParts
      });
      setIsOptimizing(false);
      setActiveTab('results');
    }, 600);
  };

  const exportCSV = () => {
    let csv = 'Part Name,Length (mm),Width (mm),Thickness (mm),Quantity,Grain,Edge Banding Top,Bottom,Left,Right\n';
    parts.forEach((p) => {
      csv += `"${p.name}",${p.length},${p.width},${p.thickness ?? 18},${p.quantity},${p.grain},${p.edgeBanding.top},${p.edgeBanding.bottom},${p.edgeBanding.left},${p.edgeBanding.right}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'madcut_parts_list.csv');
    a.click();
  };

  const exportExcelMock = () => {
    exportCSV();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans text-base print:bg-white print:text-black print:h-auto print:w-auto print:overflow-visible">
      
      {/* Sleek, Compact Sidebar */}
      <aside className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col print:hidden shadow-xl shrink-0">
        <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-slate-800">
          <div className="bg-amber-500 p-1.5 rounded-none text-slate-950 font-extrabold">
            <Scissors size={20} />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide text-white">MadCut Master</h1>
            <p className="text-[10px] font-semibold text-amber-400">Pro Optimizer</p>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <SidebarButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <SidebarButton active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} icon={<Boxes size={16} />} label="Raw Stock" />
          <SidebarButton active={activeTab === 'parts'} onClick={() => setActiveTab('parts')} icon={<FileSpreadsheet size={16} />} label="Parts List" />
          <SidebarButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<Layers size={16} />} label="Cutting Layouts" disabled={!results} />
          <SidebarButton active={activeTab === 'labels'} onClick={() => setActiveTab('labels')} icon={<QrCode size={16} />} label="QR Labels" disabled={!results} />
          <SidebarButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={16} />} label="Print Reports" disabled={!results} />
          <SidebarButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={16} />} label="Settings" />
        </nav>

        <div className="p-3 border-t border-slate-800 bg-slate-950">
          <button 
            onClick={runOptimization}
            disabled={isOptimizing || parts.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold py-2.5 px-3 rounded-none flex items-center justify-center gap-2 transition shadow cursor-pointer text-xs uppercase tracking-wider"
          >
            {isOptimizing ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
            <span>{isOptimizing ? 'Optimizing...' : 'Optimize'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Full Width & Zero Horizontal Overflow */}
      <main className="flex-1 flex flex-col h-full overflow-hidden print:overflow-visible print:h-auto min-w-0">
        
        {/* Sleek Header */}
        <header className="h-12 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 font-bold">
              Developed By MADHAN Kumar - GuruNathan
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs font-semibold text-slate-300">
            <span>Blade Kerf: <strong className="text-amber-400">{settings.kerf}mm</strong></span>
            <span>Edge Band Default: <strong className="text-amber-400">{settings.edgeBandThickness}mm</strong></span>
          </div>
        </header>

        {/* Dynamic Views Container with Internal Scrolling & No X-Scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 print:p-0 print:overflow-visible">
          
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-500/10 border-2 border-amber-500/30 p-8 rounded-none flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-extrabold text-white mb-2">MadCut Master Control</h2>
                  <p className="text-slate-200 text-base max-w-4xl font-medium">
                    Fully optimized with thickness parameters, ultra-dense compact QR label grids, and precise layout rendering.
                  </p>
                </div>
                <button 
                  onClick={runOptimization}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-4 rounded-none flex items-center gap-3 shadow-xl text-base cursor-pointer shrink-0"
                >
                  <Play size={20} /> Run Optimization Now
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Active Stock Sheets" value={stocks.reduce((acc, s) => acc + s.quantity, 0)} icon={<Boxes className="text-amber-400" size={28} />} />
                <StatCard title="Parts to Cut" value={parts.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0)} icon={<FileSpreadsheet className="text-amber-400" size={28} />} />
                <StatCard title="Last Optimization Waste" value={results ? `${results.wastePercentage}%` : 'N/A'} icon={<Layers className="text-amber-400" size={28} />} />
              </div>
            </div>
          )}

          {/* STOCK VIEW */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-white">Raw Material Inventory</h2>
              <form onSubmit={handleAddStock} className="bg-slate-950 p-6 rounded-none border border-slate-800 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-slate-300 block mb-1">Material Name</label>
                  <input type="text" placeholder="e.g. Plywood 18mm" value={newStock.name} onChange={e=>setNewStock({...newStock, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" required />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-300 block mb-1">Length (mm)</label>
                  <input type="number" placeholder="2440" value={newStock.length} onChange={e=>setNewStock({...newStock, length: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" required />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-300 block mb-1">Width (mm)</label>
                  <input type="number" placeholder="1220" value={newStock.width} onChange={e=>setNewStock({...newStock, width: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" required />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-300 block mb-1">Thickness (mm)</label>
                  <input type="number" placeholder="18" value={newStock.thickness} onChange={e=>setNewStock({...newStock, thickness: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-300 block mb-1">Quantity</label>
                  <input type="number" placeholder="10" value={newStock.quantity} onChange={e=>setNewStock({...newStock, quantity: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" required />
                </div>
                <button type="submit" className="md:col-span-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-none flex items-center justify-center gap-2 cursor-pointer text-base">
                  <Plus size={20} /> Add Stock
                </button>
              </form>

              <div className="bg-slate-950 rounded-none border border-slate-800 overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse text-base">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-300 bg-slate-900/80 font-bold">
                      <th className="p-4">Material Name</th>
                      <th className="p-4">Dimensions (L × W)</th>
                      <th className="p-4">Thickness</th>
                      <th className="p-4">Qty</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map(s => (
                      <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                        <td className="p-4 font-bold text-white">{s.name}</td>
                        <td className="p-4 font-medium">{s.length} × {s.width} mm</td>
                        <td className="p-4 font-medium">{s.thickness || 18} mm</td>
                        <td className="p-4 font-bold text-amber-400">{s.quantity}</td>
                        <td className="p-4">
                          <button onClick={()=>setStocks(stocks.filter(x=>x.id!==s.id))} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={20}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PARTS VIEW */}
          {activeTab === 'parts' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-2xl font-extrabold text-white">Cut-list Required Parts</h2>
                
                <div className="flex flex-wrap items-center gap-3">
                  <label className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2 border border-slate-700 cursor-pointer">
                    <Upload size={18} /> Import CSV / Excel
                    <input type="file" accept=".csv, .txt, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button onClick={exportExcelMock} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2 border border-slate-700 cursor-pointer">
                    <Download size={18} /> Export Excel (.xlsx)
                  </button>
                  <button onClick={exportCSV} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2 border border-slate-700 cursor-pointer">
                    <Download size={18} /> Export CSV
                  </button>
                </div>
              </div>

              {/* ADD PART FORM */}
              <form onSubmit={handleAddPart} className="bg-slate-950 p-6 rounded-none border border-slate-800 space-y-4">
                <h3 className="text-sm font-extrabold uppercase text-amber-400 tracking-wider">Add New Part</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-300 block mb-1">Part Name</label>
                    <input type="text" placeholder="e.g. Cabinet Left Side" value={newPart.name} onChange={e=>setNewPart({...newPart, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" required />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-300 block mb-1">Length (mm)</label>
                    <input type="number" placeholder="720" value={newPart.length} onChange={e=>setNewPart({...newPart, length: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" required />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-300 block mb-1">Width (mm)</label>
                    <input type="number" placeholder="560" value={newPart.width} onChange={e=>setNewPart({...newPart, width: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" required />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-300 block mb-1">Thickness (mm)</label>
                    <input type="number" placeholder="18" value={newPart.thickness} onChange={e=>setNewPart({...newPart, thickness: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" required />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-300 block mb-1">Quantity</label>
                    <input type="number" placeholder="2" value={newPart.quantity} onChange={e=>setNewPart({...newPart, quantity: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" required />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-800 gap-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2.5 text-base font-bold text-slate-200 cursor-pointer">
                      <input type="checkbox" checked={newPart.grain} onChange={e=>setNewPart({...newPart, grain: e.target.checked})} className="w-5 h-5 rounded-none bg-slate-900 border-slate-700 text-amber-500" />
                      <span>Lock Grain Direction</span>
                    </label>
                    <div className="flex items-center gap-4 text-base font-bold text-slate-200">
                      <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wide">Edge Banding:</span>
                      {['top', 'bottom', 'left', 'right'].map(edge => (
                        <label key={edge} className="flex items-center gap-1.5 cursor-pointer capitalize">
                          <input type="checkbox" checked={newPart.edgeBanding[edge]} onChange={e=>setNewPart({...newPart, edgeBanding: {...newPart.edgeBanding, [edge]: e.target.checked}})} className="w-4 h-4 rounded-none bg-slate-900 border-slate-700 text-amber-500" />
                          <span className="text-sm font-semibold">{edge}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 px-6 rounded-none flex items-center gap-2 cursor-pointer text-base">
                    <Plus size={20} /> Add Part
                  </button>
                </div>
              </form>

              {/* EDIT PART MODAL / FORM INLINE */}
              {editingPartId && (
                <form onSubmit={handleSaveEditPart} className="bg-amber-500/10 border-2 border-amber-500 p-6 rounded-none space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase text-amber-400 tracking-wider">Editing Part ID: {editingPartId}</h3>
                    <button type="button" onClick={()=>setEditingPartId(null)} className="text-slate-300 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-bold text-slate-300 block mb-1">Part Name</label>
                      <input type="text" value={editPartData.name} onChange={e=>setEditPartData({...editPartData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-300 block mb-1">Length (mm)</label>
                      <input type="number" value={editPartData.length} onChange={e=>setEditPartData({...editPartData, length: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-300 block mb-1">Width (mm)</label>
                      <input type="number" value={editPartData.width} onChange={e=>setEditPartData({...editPartData, width: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-300 block mb-1">Thickness (mm)</label>
                      <input type="number" value={editPartData.thickness} onChange={e=>setEditPartData({...editPartData, thickness: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-300 block mb-1">Quantity</label>
                      <input type="number" value={editPartData.quantity} onChange={e=>setEditPartData({...editPartData, quantity: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between pt-4 border-t border-amber-500/40 gap-4">
                    <div className="flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2.5 text-base font-bold text-slate-200 cursor-pointer">
                        <input type="checkbox" checked={editPartData.grain} onChange={e=>setEditPartData({...editPartData, grain: e.target.checked})} className="w-5 h-5 rounded-none bg-slate-900 border-slate-700 text-amber-500" />
                        <span>Lock Grain Direction</span>
                      </label>
                      <div className="flex items-center gap-4 text-base font-bold text-slate-200">
                        <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wide">Edge Banding:</span>
                        {['top', 'bottom', 'left', 'right'].map(edge => (
                          <label key={edge} className="flex items-center gap-1.5 cursor-pointer capitalize">
                            <input type="checkbox" checked={editPartData.edgeBanding[edge]} onChange={e=>setEditPartData({...editPartData, edgeBanding: {...editPartData.edgeBanding, [edge]: e.target.checked}})} className="w-4 h-4 rounded-none bg-slate-900 border-slate-700 text-amber-500" />
                            <span className="text-sm font-semibold">{edge}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={()=>setEditingPartId(null)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-5 rounded-none cursor-pointer">Cancel</button>
                      <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 px-6 rounded-none cursor-pointer">Save Changes</button>
                    </div>
                  </div>
                </form>
              )}

              {/* PARTS TABLE */}
              <div className="bg-slate-950 rounded-none border border-slate-800 overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse text-base">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-300 bg-slate-900/80 font-bold">
                      <th className="p-4">#</th>
                      <th className="p-4">Part Name</th>
                      <th className="p-4">Dimensions (L × W × Thk)</th>
                      <th className="p-4">Qty</th>
                      <th className="p-4">Grain</th>
                      <th className="p-4">Edge Banding</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p, idx) => (
                      <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                        <td className="p-4 font-extrabold text-amber-400">{idx + 1}</td>
                        <td className="p-4 font-bold text-white">{p.name || <span className="text-red-400 italic">Missing Name</span>}</td>
                        <td className="p-4 font-medium">
                          {p.length !== '' ? p.length : <span className="text-red-400 italic">--</span>} × {' '}
                          {p.width !== '' ? p.width : <span className="text-red-400 italic">--</span>} × {' '}
                          <strong className="text-amber-400">{p.thickness !== '' ? p.thickness : 18}</strong> mm
                        </td>
                        <td className="p-4 font-bold text-amber-400">{p.quantity !== '' ? p.quantity : <span className="text-red-400 italic">--</span>}</td>
                        <td className="p-4 font-medium">{p.grain ? 'Locked' : 'Free'}</td>
                        <td className="p-4 text-sm font-semibold text-slate-300">
                          {Object.entries(p.edgeBanding).filter(([_,v])=>v).map(([k])=>k).join(', ') || 'None'}
                        </td>
                        <td className="p-4 flex items-center gap-3">
                          <button onClick={()=>startEditingPart(p)} className="text-amber-400 hover:text-amber-300 p-2 cursor-pointer" title="Edit Part"><Edit2 size={18}/></button>
                          <button onClick={()=>setParts(parts.filter(x=>x.id!==p.id))} className="text-red-400 hover:text-red-300 p-2 cursor-pointer" title="Delete Part"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RESULTS VIEW */}
          {activeTab === 'results' && results && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Optimized Cutting Layouts</h2>
                  <p className="text-sm font-bold text-amber-400">Bold underlined dimensions denote active edge banding specification</p>
                </div>
                <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 text-base font-bold flex items-center gap-2 border border-slate-700 cursor-pointer">
                  <Printer size={20} /> Print / Export PDF
                </button>
              </div>

              <div className="space-y-12">
                {results.sheets.map(sheet => {
                  const masterStockL = (sheet.length + settings.trimLeft + settings.trimRight);
                  const masterStockW = (sheet.width + settings.trimTop + settings.trimBottom);
                  const sheetThk = sheet.thickness || 18;
                  const scaleX = 100 / masterStockL;
                  const scaleY = 100 / masterStockW;

                  const wasteZones = [];
                  sheet.freeRects.forEach((fr, fIdx) => {
                    if (fr.w > 15 && fr.h > 15) {
                      wasteZones.push({
                        id: `W-${fIdx}`,
                        x: fr.x,
                        y: fr.y,
                        w: fr.w,
                        h: fr.h
                      });
                    }
                  });

                  return (
                    <div key={sheet.id} className="bg-white text-black border-4 border-black p-6 rounded-none shadow-xl break-after-page">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
                        <h3 className="font-extrabold text-lg flex items-center gap-3">
                          <span className="bg-black text-white px-3 py-1 text-sm font-extrabold">SHEET #{sheet.id}</span>
                          Plywood Stock Sheet ({masterStockL} × {masterStockW} × {sheetThk}mm Thickness)
                        </h3>
                        <span className="text-sm font-mono font-bold">Placed Parts: {sheet.placedParts.length} | Waste: {results.wastePercentage}%</span>
                      </div>

                      <div className="relative w-full bg-white border-2 border-black aspect-[2/1] min-h-[520px]">
                        
                        {wasteZones.map((waste, wIdx) => (
                          <div
                            key={`waste-${wIdx}`}
                            style={{
                              left: `${waste.x * scaleX}%`,
                              top: `${waste.y * scaleY}%`,
                              width: `${waste.w * scaleX}%`,
                              height: `${waste.h * scaleY}%`,
                              backgroundImage: `repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.12) 0, rgba(0, 0, 0, 0.12) 2px, transparent 0, transparent 8px)`
                            }}
                            className="absolute border border-dashed border-black/70 flex flex-col items-center justify-center p-1 overflow-hidden pointer-events-none"
                          >
                            <span className="bg-white px-1.5 py-0.5  border-black font-mono font-black text-xs text-black shadow-sm">
                              WASTE: {Math.round(waste.w)} × {Math.round(waste.h)} mm
                            </span>
                          </div>
                        ))}

                        {sheet.placedParts.map((part, idx) => {
                          const ebTopActive = part.currentEB.top;
                          const ebBotActive = part.currentEB.bottom;
                          const ebLeftActive = part.currentEB.left;
                          const ebRightActive = part.currentEB.right;

                          const area = part.w * part.h;
                          const isVerySmallPiece = area < 25000;

                          return (
                            <div 
                              key={idx}
                              style={{
                                left: `${part.x * scaleX}%`,
                                top: `${part.y * scaleY}%`,
                                width: `${part.w * scaleX}%`,
                                height: `${part.h * scaleY}%`,
                              }}
                              className="absolute bg-white border-2 border-black p-0.5 flex flex-col justify-between overflow-hidden rounded-none font-mono text-black shadow-sm"
                            >
                              {/* TOP DIMENSION */}
                              <div className="text-center shrink-0 leading-none bg-white/95 z-10">
                                <span className={`font-bold ${ebTopActive ? 'underline decoration-2 decoration-black' : ''} ${isVerySmallPiece ? 'text-[9px]' : 'text-xs'}`}>
                                  {part.origW} mm
                                </span>
                              </div>

                              {/* CENTER ORGANIZED CARD DATA */}
                              <div className="text-center my-auto bg-slate-50 border-black py-0.5 px-0.5 flex flex-col justify-center">
                                <span className="bg-black text-white font-black px-1 text-[9px] w-max mx-auto">#{part.id}</span>
                                {!isVerySmallPiece && (
                                  <p className="font-extrabold uppercase tracking-tight px-5 leading-tight text-xs">{part.name}</p>
                                )}
                                <p className={`font-bold text-black ${isVerySmallPiece ? 'text-[9px]' : 'text-xs'}`}>Cut: {part.w}×{part.h}</p>
                              </div>

                              {/* BOTTOM DIMENSION */}
                              <div className="text-center shrink-0 leading-none bg-white/95 z-10">
                                <span className={`font-bold ${ebBotActive ? 'underline decoration-2 decoration-black' : ''} ${isVerySmallPiece ? 'text-[9px]' : 'text-xs'}`}>
                                  {part.origW} mm
                                </span>
                              </div>

                              {/* LEFT & RIGHT SIDES ROTATED & BOLD */}
                              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-0.5 pointer-events-none z-10">
                                <span 
                                  style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                                  className={`bg-white px-0.5 border-black/30 font-bold ${ebLeftActive ? 'underline decoration-2 decoration-black' : ''} ${isVerySmallPiece ? 'text-[8px]' : 'text-[11px]'}`}
                                >
                                  {part.origH} mm
                                </span>
                                <span 
                                  style={{ writingMode: 'vertical-lr' }}
                                  className={`bg-white px-0.5 border-black/30 font-bold ${ebRightActive ? 'underline decoration-2 decoration-black' : ''} ${isVerySmallPiece ? 'text-[8px]' : 'text-[11px]'}`}
                                >
                                  {part.origH} mm
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LABELS VIEW - HIGH DENSITY 3x4 GRID TO FIT AS MANY AS POSSIBLE ON A SINGLE A4 SHEET */}
          {activeTab === 'labels' && results && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Cut Part Labels (High Density A4 Grid)</h2>
                  <p className="text-sm font-semibold text-slate-300">Clean, concise layout fitted to maximize labels per A4 page without net dimensions or edgeband clutter</p>
                </div>
                <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 text-base font-bold flex items-center gap-2 border border-slate-700 cursor-pointer">
                  <Printer size={20} /> Print Labels Grid
                </button>
              </div>

              {/* PRINT CONTAINER DESIGNED FOR HIGH DENSITY A4 SHEET FIT */}
              <div className="grid grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                {results.expandedParts.map((part, index) => {
                  const structuredQRText = 
                    `ID: ${part.id} | ${part.name}\n` +
                    `DIM: ${part.origLength} x ${part.origWidth} x ${part.thickness || 18}mm\n` +
                    `QTY: ${part.quantity}`;

                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(structuredQRText)}`;

                  return (
                    <div key={index} className="bg-white text-black p-3 rounded-none border-2 border-black shadow-sm flex gap-3 items-center break-inside-avoid">
                      
                      {/* QR CODE */}
                      <div className="bg-white p-0.5 border border-black shrink-0">
                        <img src={qrUrl} alt="QR Code" className="w-24 h-24 object-contain" />
                      </div>

                      {/* CONCISE ESSENTIAL DETAILS (NO NET DIMENSIONS, NO EDGEBAND) */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-black uppercase bg-white text-black px-1.5 py-0.2">#{part.id}</span>
                            <span className="text-[10px] font-bold bg-amber-200 text-black px-1 py-0.2 border border-black">Qty: {part.quantity}</span>
                          </div>
                          <h4 className="font-extrabold text-xs leading-tight mt-1 text-black ">{part.name}</h4>
                        </div>

                        <div className=" text-xs font-bold text-black border-t border-black pt-1 space-y-0.5">
                          <div>Size: <span className="font-black text-[14px]">{part.origLength} mm × {part.origWidth} mm</span></div>
                          <div>Thk: <span className="font-black text-amber-800">{part.thickness || 18}mm</span></div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PRINT & PDF COMPILED REPORTS HUB */}
          {activeTab === 'reports' && results && (
            <div className="space-y-6 max-w-4xl mx-auto bg-slate-950 p-8 rounded-none border border-slate-800 shadow-xl print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
              
              {/* CONFIGURATION SCREEN (Hidden on Print) */}
              <div className="print:hidden">
                <h2 className="text-2xl font-extrabold text-white mb-2">A4 Report Generator & Compiled PDF Export</h2>
                <p className="text-base font-semibold text-slate-300 mb-6">Select documentation sections to include in your compiled printable PDF package:</p>

                <div className="space-y-5 border-y border-slate-800 py-6 mb-8">
                  <label className="flex items-center gap-4 text-base font-bold text-slate-200 cursor-pointer">
                    <input type="checkbox" checked={printOptions.partsList} onChange={e=>setPrintOptions({...printOptions, partsList: e.target.checked})} className="w-5 h-5 rounded-none bg-slate-900 border-slate-700 text-amber-500" />
                    <span>Include Required Parts Summary Table</span>
                  </label>
                  <label className="flex items-center gap-4 text-base font-bold text-slate-200 cursor-pointer">
                    <input type="checkbox" checked={printOptions.layouts} onChange={e=>setPrintOptions({...printOptions, layouts: e.target.checked})} className="w-5 h-5 rounded-none bg-slate-900 border-slate-700 text-amber-500" />
                    <span>Include Optimized B&W Cutting Layout Diagrams</span>
                  </label>
                  <label className="flex items-center gap-4 text-base font-bold text-slate-200 cursor-pointer">
                    <input type="checkbox" checked={printOptions.labels} onChange={e=>setPrintOptions({...printOptions, labels: e.target.checked})} className="w-5 h-5 rounded-none bg-slate-900 border-slate-700 text-amber-500" />
                    <span>Include High Density Part QR Labels Grid</span>
                  </label>
                </div>

                <div className="flex justify-end gap-4">
                  <button onClick={() => window.print()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-8 py-4 rounded-none flex items-center gap-3 cursor-pointer text-base shadow-lg">
                    <Printer size={20} /> Print / Export Compiled PDF Package
                  </button>
                </div>
              </div>

              {/* COMPILED PRINT DOCUMENT CONTAINER */}
              <div className="hidden print:block space-y-10 text-black">
                
                {/* 1. COMPILED PARTS LIST SECTION */}
                {printOptions.partsList && (
                  <div className="space-y-4 break-after-page">
                    <div className="border-b-4 border-black pb-3">
                      <h1 className="text-3xl font-black uppercase">MadCut Master - Required Parts Summary</h1>
                      <p className="text-sm font-bold text-slate-700">Compiled Production Documentation</p>
                    </div>
                    <table className="w-full text-left border-collapse border-2 border-black text-sm">
                      <thead>
                        <tr className="bg-black text-black font-bold">
                          <th className="p-3 border border-black">#</th>
                          <th className="p-3 border border-black">Part Name</th>
                          <th className="p-3 border border-black">Dimensions (L × W × Thk)</th>
                          <th className="p-3 border border-black">Qty</th>
                          <th className="p-3 border border-black">Grain</th>
                          <th className="p-3 border border-black">Edge Banding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parts.map((p, idx) => (
                          <tr key={p.id} className="border-b border-black">
                            <td className="p-3 border border-black font-black">{idx + 1}</td>
                            <td className="p-3 border border-black font-bold">{p.name}</td>
                            <td className="p-3 border border-black font-medium">{p.length} × {p.width} × {p.thickness || 18} mm</td>
                            <td className="p-3 border border-black font-bold">{p.quantity}</td>
                            <td className="p-3 border border-black font-medium">{p.grain ? 'Locked' : 'Free'}</td>
                            <td className="p-3 border border-black font-semibold">
                              {Object.entries(p.edgeBanding).filter(([_,v])=>v).map(([k])=>k).join(', ') || 'None'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2. COMPILED CUTTING LAYOUTS SECTION */}
                {printOptions.layouts && results.sheets.map(sheet => {
                  const masterStockL = (sheet.length + settings.trimLeft + settings.trimRight);
                  const masterStockW = (sheet.width + settings.trimTop + settings.trimBottom);
                  const sheetThk = sheet.thickness || 18;
                  const scaleX = 100 / masterStockL;
                  const scaleY = 100 / masterStockW;

                  const wasteZones = [];
                  sheet.freeRects.forEach((fr, fIdx) => {
                    if (fr.w > 15 && fr.h > 15) {
                      wasteZones.push({ id: `W-${fIdx}`, x: fr.x, y: fr.y, w: fr.w, h: fr.h });
                    }
                  });

                  return (
                    <div key={`print-sheet-${sheet.id}`} className="bg-white text-black border-4 border-black p-6 break-after-page">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
                        <h3 className="font-extrabold text-xl flex items-center gap-3">
                          <span className="bg-black text-black px-3 py-1 text-sm font-extrabold">SHEET #{sheet.id}</span>
                          Cutting Layout ({masterStockL} × {masterStockW} × {sheetThk}mm Thickness)
                        </h3>
                        <span className="text-sm font-mono font-bold">Placed Parts: {sheet.placedParts.length} | Waste: {results.wastePercentage}%</span>
                      </div>

                      <div className="relative w-full bg-white border-2 border-black aspect-[2/1] min-h-[500px]">
                        {wasteZones.map((waste, wIdx) => (
                          <div
                            key={`print-w-${wIdx}`}
                            style={{
                              left: `${waste.x * scaleX}%`,
                              top: `${waste.y * scaleY}%`,
                              width: `${waste.w * scaleX}%`,
                              height: `${waste.h * scaleY}%`,
                              backgroundImage: `repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.12) 0, rgba(0, 0, 0, 0.12) 2px, transparent 0, transparent 8px)`
                            }}
                            className="absolute border border-dashed border-black/70 flex flex-col items-center justify-center p-1 overflow-hidden pointer-events-none"
                          >
                            <span className="bg-white px-1 py-0.5 border-black font-mono font-black text-xs text-black">
                              WASTE: {Math.round(waste.w)} × {Math.round(waste.h)} mm
                            </span>
                          </div>
                        ))}

                        {sheet.placedParts.map((part, idx) => {
                          const ebTopActive = part.currentEB.top;
                          const ebBotActive = part.currentEB.bottom;
                          const ebLeftActive = part.currentEB.left;
                          const ebRightActive = part.currentEB.right;
                          const area = part.w * part.h;
                          const isVerySmallPiece = area < 25000;

                          return (
                            <div 
                              key={`print-part-${idx}`}
                              style={{
                                left: `${part.x * scaleX}%`,
                                top: `${part.y * scaleY}%`,
                                width: `${part.w * scaleX}%`,
                                height: `${part.h * scaleY}%`,
                              }}
                              className="absolute bg-white border-2 border-black p-0.5 flex flex-col justify-between overflow-hidden rounded-none font-mono text-black shadow-sm"
                            >
                              <div className="text-center shrink-0 leading-none bg-white/95 z-10">
                                <span className={`font-bold ${ebTopActive ? 'underline decoration-2 decoration-black' : ''} ${isVerySmallPiece ? 'text-[9px]' : 'text-xs'}`}>
                                  {part.origW}mm
                                </span>
                              </div>

                              <div className="text-center my-auto bg-slate-50  border-black py-0.5 px-0.5 flex flex-col justify-center">
                                <span className="bg-black text-black font-black px-1 text-[9px] w-max mx-auto">#{part.id}</span>
                                {!isVerySmallPiece && (
                                  <p className="font-extrabold uppercase tracking-tight px-5 py-1 leading-tight text-xs">{part.name}</p>
                                )}
                                <p className={`font-bold text-black ${isVerySmallPiece ? 'text-[9px]' : 'text-xs'}`}>Cut: {part.w}×{part.h}</p>
                              </div>

                              <div className="text-center shrink-0 leading-none bg-white/95 z-10">
                                <span className={`font-bold ${ebBotActive ? 'underline decoration-2 decoration-black' : ''} ${isVerySmallPiece ? 'text-[9px]' : 'text-xs'}`}>
                                  {part.origW}mm
                                </span>
                              </div>

                              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-0.5 pointer-events-none z-10">
                                <span 
                                  style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                                  className={`bg-white px-0.5 border border-black/30 font-bold ${ebLeftActive ? 'underline decoration-2 decoration-black' : ''} ${isVerySmallPiece ? 'text-[8px]' : 'text-[11px]'}`}
                                >
                                  {part.origH}mm
                                </span>
                                <span 
                                  style={{ writingMode: 'vertical-lr' }}
                                  className={`bg-white px-0.5 border border-black/30 font-bold ${ebRightActive ? 'underline decoration-2 decoration-black' : ''} ${isVerySmallPiece ? 'text-[8px]' : 'text-[11px]'}`}
                                >
                                  {part.origH}mm
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* 3. COMPILED QR LABELS SECTION */}
                {printOptions.labels && (
                  <div className="space-y-6 break-after-page">
                    <div className="border-b-4 border-black pb-3">
                      <h1 className="text-3xl font-black uppercase">MadCut Master - Part QR Labels</h1>
                      <p className="text-sm font-bold text-slate-700">Compiled High-Density Workshop Scanning Grid</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {results.expandedParts.map((part, index) => {
                        const structuredQRText = 
                          `ID: ${part.id} | ${part.name}\n` +
                          `DIM: ${part.origLength} x ${part.origWidth} x ${part.thickness || 18}mm\n` +
                          `QTY: ${part.quantity}`;
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(structuredQRText)}`;

                        return (
                          <div key={`print-label-${index}`} className="bg-white text-black p-2.5 border-2 border-black flex gap-2.5 items-center break-inside-avoid">
                            <div className="bg-white p-0.5 border border-black shrink-0">
                              <img src={qrUrl} alt="QR" className="w-20 h-20 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1">
                              <div>
                                <span className="text-[12px] font-black uppercase bg-black text-black px-1 py-0.2">#{part.id}</span>
                                <h4 className="font-extrabold text-xs leading-tight mt-0.5 ">{part.name}</h4>
                              </div>
                              <div className="text-[12px] font-bold border-t border-black pt-0.5 space-y-0.2">
                                <div>Size: <span className="font-black text-[14px]">{part.origLength} mm × {part.origWidth} mm</span></div>
                                <div>Thk: <span className="font-black text-black">{part.thickness || 18}mm</span></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl mx-auto bg-slate-950 p-8 rounded-none border border-slate-800 shadow-xl">
              <h2 className="text-2xl font-extrabold text-white">Cutting Parameters & Edge Banding</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-300 block mb-1">Saw Blade Kerf / Thickness (mm)</label>
                  <input type="number" value={settings.kerf} onChange={e=>setSettings({...settings, kerf: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                </div>
                
                <div className="border-t border-slate-800 pt-5">
                  <h3 className="text-base font-extrabold text-amber-400 mb-3">Sheet Trim Allowance on 4 Sides (mm)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Trim Top (mm)</label>
                      <input type="number" value={settings.trimTop} onChange={e=>setSettings({...settings, trimTop: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Trim Bottom (mm)</label>
                      <input type="number" value={settings.trimBottom} onChange={e=>setSettings({...settings, trimBottom: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Trim Left (mm)</label>
                      <input type="number" value={settings.trimLeft} onChange={e=>setSettings({...settings, trimLeft: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Trim Right (mm)</label>
                      <input type="number" value={settings.trimRight} onChange={e=>setSettings({...settings, trimRight: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-5">
                  <label className="text-sm font-bold text-slate-300 block mb-1">Default Edge Band Thickness (mm)</label>
                  <input type="number" value={settings.edgeBandThickness} onChange={e=>setSettings({...settings, edgeBandThickness: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-none px-4 py-3 text-white text-base font-medium" min="1" max="10" />
                  <p className="text-xs font-semibold text-amber-400 mt-1.5">Default set to 2mm. Automatically deducts from net cutting size when enabled.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-none text-xs font-bold transition cursor-pointer ${
        active 
          ? 'bg-amber-500 text-slate-950 font-extrabold shadow' 
          : 'text-slate-300 hover:bg-slate-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-slate-950 border border-slate-800 p-6 rounded-none flex items-center justify-between shadow-lg">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-white">{value}</h3>
      </div>
      <div className="bg-slate-900 p-3.5 rounded-none border border-slate-800 shadow-inner">
        {icon}
      </div>
    </div>
  );
}