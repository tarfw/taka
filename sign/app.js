/**
 * TAKA Scientific - Document Signer & Stamp Engine
 */

// Configure PDF.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
}

// Convert base64 data URL directly to Uint8Array for offline PDF-Lib embedding
function dataURLtoUint8Array(dataurl) {
  try {
    const parts = dataurl.split(',');
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return u8arr;
  } catch (e) {
    console.error('Error decoding base64 data URL:', e);
    throw e;
  }
}

// Application State
const state = {
  documents: [],
  activeDocId: null,
  currentPage: 1,
  zoom: 1.0,
  pageViewport: null,
  selectedItemId: null,
  
  // Batch Defaults
  batchRules: {
    target: 'last',           // 'last' | 'all' | 'first'
    position: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'center'
    scale: 1.0
  },

  // Assets
  assets: {
    stamp: window.ASSETS ? window.ASSETS.stamp : 'assets/stamp.png',
    signature: window.ASSETS ? window.ASSETS.signature : 'assets/signature.png'
  }
};

// DOM Cache
const els = {
  tabBtnQueue: document.getElementById('tab-btn-queue'),
  tabBtnPresets: document.getElementById('tab-btn-presets'),
  tabBtnEdit: document.getElementById('tab-btn-edit'),
  tabContentQueue: document.getElementById('tab-content-queue'),
  tabContentPresets: document.getElementById('tab-content-presets'),
  tabContentEdit: document.getElementById('tab-content-edit'),
  tabCount: document.getElementById('tab-count'),
  queueHeaderCount: document.getElementById('queue-header-count'),
  batchStatsBadge: document.getElementById('batch-stats-badge'),
  
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  queueList: document.getElementById('queue-list'),
  btnAddMore: document.getElementById('btn-add-more'),
  btnClearQueue: document.getElementById('btn-clear-queue'),

  sliderBatchScale: document.getElementById('slider-batch-scale'),
  valBatchScale: document.getElementById('val-batch-scale'),
  btnApplyBatchRules: document.getElementById('btn-apply-batch-rules'),
  btnApplyAllHeader: document.getElementById('btn-apply-all-header'),

  inspectorGrid: document.getElementById('inspector-grid'),
  inspectorEmpty: document.getElementById('inspector-empty'),
  sliderScale: document.getElementById('slider-scale'),
  valScale: document.getElementById('val-scale'),
  sliderRotation: document.getElementById('slider-rotation'),
  valRotation: document.getElementById('val-rotation'),
  sliderOpacity: document.getElementById('slider-opacity'),
  valOpacity: document.getElementById('val-opacity'),
  presetBR: document.getElementById('preset-br'),
  presetBL: document.getElementById('preset-bl'),
  presetCenter: document.getElementById('preset-center'),
  presetApplyAllPages: document.getElementById('preset-apply-all-pages'),
  btnDuplicate: document.getElementById('btn-duplicate'),
  btnDelete: document.getElementById('btn-delete'),

  btnSignCurrent: document.getElementById('btn-sign-current'),
  btnBatchDownloadTop: document.getElementById('btn-batch-download-top'),

  bannerFileName: document.getElementById('banner-filename'),
  pageDisplay: document.getElementById('page-display'),
  btnPrevPage: document.getElementById('btn-prev-page'),
  btnNextPage: document.getElementById('btn-next-page'),
  btnZoomIn: document.getElementById('btn-zoom-in'),
  btnZoomOut: document.getElementById('btn-zoom-out'),
  btnFitWidth: document.getElementById('btn-fit-width'),
  valZoom: document.getElementById('val-zoom'),
  viewportContainer: document.getElementById('viewport-container'),
  emptyState: document.getElementById('empty-state'),
  pageWrapper: document.getElementById('page-wrapper'),
  pdfCanvas: document.getElementById('pdf-canvas'),
  overlayLayer: document.getElementById('overlay-layer'),

  progressOverlay: document.getElementById('progress-overlay'),
  progressTitle: document.getElementById('progress-title'),
  progressStatus: document.getElementById('progress-status'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  progressPercent: document.getElementById('progress-percent'),
  toast: document.getElementById('toast')
};

// Initialize Application
function init() {
  setupEventListeners();
  setupTabHandlers();
  setupBatchRadioHandlers();
  setupImageFallbacks();
}

function setupImageFallbacks() {
  if (window.ASSETS) {
    const pStamp = document.getElementById('img-preview-stamp');
    const pSig = document.getElementById('img-preview-sig');
    if (pStamp) pStamp.src = window.ASSETS.stamp;
    if (pSig) pSig.src = window.ASSETS.signature;
  }
}

// Event Listeners
function setupEventListeners() {
  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.btnAddMore.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', handleFileSelect);

  els.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropzone.classList.add('dragover');
  });

  els.dropzone.addEventListener('dragleave', () => {
    els.dropzone.classList.remove('dragover');
  });

  els.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(Array.from(e.dataTransfer.files));
    }
  });

  els.btnClearQueue.addEventListener('click', clearAllQueue);

  document.querySelectorAll('.stamp-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-type');
      addItemToActiveDoc(type);
    });
  });

  els.btnPrevPage.addEventListener('click', () => changePage(state.currentPage - 1));
  els.btnNextPage.addEventListener('click', () => changePage(state.currentPage + 1));

  els.btnZoomIn.addEventListener('click', () => setZoom(state.zoom + 0.15));
  els.btnZoomOut.addEventListener('click', () => setZoom(state.zoom - 0.15));
  els.btnFitWidth.addEventListener('click', fitToWidth);

  els.sliderScale.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    els.valScale.textContent = `${val}%`;
    updateSelectedItem({ scale: val / 100 });
  });

  els.sliderRotation.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    els.valRotation.textContent = `${val}°`;
    updateSelectedItem({ rotation: val });
  });

  els.sliderOpacity.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    els.valOpacity.textContent = `${val}%`;
    updateSelectedItem({ opacity: val / 100 });
  });

  els.presetBR.addEventListener('click', () => placePreset('bottom-right'));
  els.presetBL.addEventListener('click', () => placePreset('bottom-left'));
  els.presetCenter.addEventListener('click', () => placePreset('center'));
  els.presetApplyAllPages.addEventListener('click', duplicateToAllPages);
  els.btnDuplicate.addEventListener('click', duplicateSelectedItem);
  els.btnDelete.addEventListener('click', deleteSelectedItem);

  els.sliderBatchScale.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    els.valBatchScale.textContent = `${val}%`;
    state.batchRules.scale = val / 100;
  });

  els.btnApplyBatchRules.addEventListener('click', applyBatchRulesToAll);
  if (els.btnApplyAllHeader) els.btnApplyAllHeader.addEventListener('click', applyBatchRulesToAll);

  els.btnSignCurrent.addEventListener('click', downloadCurrentSignedPdf);
  els.btnBatchDownloadTop.addEventListener('click', batchSignAndDownloadZip);

  els.pageWrapper.addEventListener('pointerdown', (e) => {
    if (e.target === els.pageWrapper || e.target === els.pdfCanvas || e.target === els.overlayLayer) {
      selectItem(null);
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedItemId && document.activeElement.tagName !== 'INPUT') {
      deleteSelectedItem();
    }
  });
}

function setupTabHandlers() {
  function switchTab(tab) {
    els.tabBtnQueue.classList.toggle('active', tab === 'queue');
    els.tabBtnPresets.classList.toggle('active', tab === 'presets');
    els.tabBtnEdit.classList.toggle('active', tab === 'edit');

    els.tabContentQueue.style.display = tab === 'queue' ? 'block' : 'none';
    els.tabContentPresets.style.display = tab === 'presets' ? 'block' : 'none';
    els.tabContentEdit.style.display = tab === 'edit' ? 'block' : 'none';
  }

  els.tabBtnQueue.addEventListener('click', () => switchTab('queue'));
  els.tabBtnPresets.addEventListener('click', () => switchTab('presets'));
  els.tabBtnEdit.addEventListener('click', () => switchTab('edit'));
}

function setupBatchRadioHandlers() {
  document.querySelectorAll('#batch-page-target .radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#batch-page-target .radio-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.batchRules.target = btn.getAttribute('data-value');
    });
  });

  document.querySelectorAll('#batch-pos-group .radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#batch-pos-group .radio-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.batchRules.position = btn.getAttribute('data-value');
    });
  });
}

function handleFileSelect(e) {
  if (e.target.files && e.target.files.length > 0) {
    handleIncomingFiles(Array.from(e.target.files));
    e.target.value = '';
  }
}

async function handleIncomingFiles(fileList) {
  const pdfFiles = fileList.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  
  if (pdfFiles.length === 0) {
    showToast('No valid PDF files selected.', 'error');
    return;
  }

  showToast(`Loading ${pdfFiles.length} file(s)...`);

  for (const file of pdfFiles) {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await addDocumentToQueue(file.name, file.size, bytes);
    } catch (err) {
      console.error(`Error loading ${file.name}:`, err);
    }
  }

  updateQueueUI();
  showToast(`Loaded ${pdfFiles.length} document(s).`);
}

async function addDocumentToQueue(name, size, pdfUint8Array) {
  // Pass a cloned copy of bytes to PDF.js
  const pdfJsData = new Uint8Array(pdfUint8Array.buffer.slice(pdfUint8Array.byteOffset, pdfUint8Array.byteOffset + pdfUint8Array.byteLength));
  const loadingTask = pdfjsLib.getDocument({ data: pdfJsData });
  const pdfJsDoc = await loadingTask.promise;
  const numPages = pdfJsDoc.numPages;

  // Cache unscaled dimensions for each page
  const pageDimensions = {};
  for (let p = 1; p <= numPages; p++) {
    const page = await pdfJsDoc.getPage(p);
    const vp = page.getViewport({ scale: 1.0 });
    pageDimensions[p] = { width: vp.width, height: vp.height };
  }

  const docId = 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  
  const newDoc = {
    id: docId,
    name: name,
    size: size,
    rawBytes: new Uint8Array(pdfUint8Array.buffer.slice(pdfUint8Array.byteOffset, pdfUint8Array.byteOffset + pdfUint8Array.byteLength)),
    pdfJsDoc: pdfJsDoc,
    numPages: numPages,
    pageDimensions: pageDimensions,
    pageItems: {},
    status: 'ready'
  };

  // Automatically apply both Stamp AND Signature to document
  applyRuleToDocument(newDoc, state.batchRules);

  state.documents.push(newDoc);

  if (!state.activeDocId) {
    setActiveDocument(docId);
  }
}

// Automatically places BOTH Company Stamp AND Signature onto document with accurate per-page dimensions
function applyRuleToDocument(doc, rules) {
  doc.pageItems = {};

  let targetPages = [];
  if (rules.target === 'last') {
    targetPages = [doc.numPages];
  } else if (rules.target === 'first') {
    targetPages = [1];
  } else if (rules.target === 'all') {
    for (let p = 1; p <= doc.numPages; p++) targetPages.push(p);
  }

  targetPages.forEach(p => {
    const pageDim = (doc.pageDimensions && doc.pageDimensions[p]) || { width: 595.28, height: 841.89 };
    const pw = pageDim.width;
    const ph = pageDim.height;

    const stampW = 150 * rules.scale;
    const stampH = 62 * rules.scale;
    const sigW = 85 * rules.scale;
    const sigH = 42 * rules.scale;

    // Jitter for natural unique hand-stamped & signed look
    const jitterX = (Math.random() - 0.5) * 6;
    const jitterY = (Math.random() - 0.5) * 6;
    const stampRot = parseFloat(((Math.random() - 0.5) * 3).toFixed(1));
    const sigRot = parseFloat(((Math.random() - 0.5) * 4).toFixed(1));

    let stampX = pw - stampW - 40 + jitterX;
    let stampY = ph - stampH - 45 + jitterY;

    let sigX = stampX + (stampW * 0.45);
    let sigY = stampY - (sigH * 0.5);

    if (rules.position === 'bottom-left') {
      stampX = 40 + jitterX;
      stampY = ph - stampH - 45 + jitterY;
      sigX = stampX + (stampW * 0.45);
      sigY = stampY - (sigH * 0.5);
    } else if (rules.position === 'center') {
      stampX = (pw - stampW) / 2 + jitterX;
      stampY = (ph - stampH) / 2 + jitterY;
      sigX = stampX + (stampW * 0.45);
      sigY = stampY - (sigH * 0.5);
    }

    if (!doc.pageItems[p]) doc.pageItems[p] = [];

    // Add Company Stamp
    doc.pageItems[p].push({
      id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      type: 'stamp',
      x: stampX,
      y: stampY,
      baseWidth: 150,
      baseHeight: 62,
      scale: rules.scale,
      rotation: stampRot,
      opacity: 1.0,
      imgDataUrl: state.assets.stamp
    });

    // Add Signature
    doc.pageItems[p].push({
      id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      type: 'signature',
      x: sigX,
      y: sigY,
      baseWidth: 85,
      baseHeight: 42,
      scale: rules.scale,
      rotation: sigRot,
      opacity: 1.0,
      imgDataUrl: state.assets.signature
    });
  });
}

function applyBatchRulesToAll() {
  if (state.documents.length === 0) {
    showToast('No documents in queue.', 'error');
    return;
  }

  state.documents.forEach(doc => {
    applyRuleToDocument(doc, state.batchRules);
  });

  if (state.activeDocId) {
    renderCurrentPage();
  }

  showToast(`Applied stamp & signature to all ${state.documents.length} document(s).`);
}

function setActiveDocument(docId) {
  state.activeDocId = docId;
  state.currentPage = 1;
  state.selectedItemId = null;
  selectItem(null);

  const activeDoc = getActiveDoc();
  if (activeDoc) {
    els.bannerFileName.textContent = activeDoc.name;
    els.emptyState.style.display = 'none';
    els.pageWrapper.style.display = 'block';
    renderCurrentPage();
  } else {
    els.bannerFileName.textContent = 'No document selected';
    els.emptyState.style.display = 'flex';
    els.pageWrapper.style.display = 'none';
  }

  updateQueueUI();
}

function getActiveDoc() {
  return state.documents.find(d => d.id === state.activeDocId);
}

function updateQueueUI() {
  const count = state.documents.length;
  els.tabCount.textContent = count;
  els.queueHeaderCount.textContent = `Queue (${count} File${count !== 1 ? 's' : ''})`;
  els.batchStatsBadge.textContent = `${count} Document${count !== 1 ? 's' : ''}`;

  els.queueList.innerHTML = '';

  state.documents.forEach(doc => {
    const itemEl = document.createElement('div');
    itemEl.className = `queue-item ${doc.id === state.activeDocId ? 'active' : ''}`;
    
    const sizeKb = (doc.size / 1024).toFixed(0);

    itemEl.innerHTML = `
      <div class="queue-item-info">
        <div class="queue-item-name" title="${doc.name}">${doc.name}</div>
        <div class="queue-item-sub">${doc.numPages} Page${doc.numPages > 1 ? 's' : ''} • ${sizeKb} KB</div>
      </div>
      <div class="queue-item-actions">
        <button class="btn-remove-item" title="Remove" data-id="${doc.id}">✕</button>
      </div>
    `;

    itemEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-item')) {
        e.stopPropagation();
        removeDocFromQueue(doc.id);
        return;
      }
      setActiveDocument(doc.id);
    });

    els.queueList.appendChild(itemEl);
  });
}

function removeDocFromQueue(docId) {
  state.documents = state.documents.filter(d => d.id !== docId);
  if (state.activeDocId === docId) {
    state.activeDocId = state.documents.length > 0 ? state.documents[0].id : null;
    setActiveDocument(state.activeDocId);
  } else {
    updateQueueUI();
  }
}

function clearAllQueue() {
  if (state.documents.length === 0) return;
  state.documents = [];
  state.activeDocId = null;
  setActiveDocument(null);
  showToast('Queue cleared.');
}

async function renderCurrentPage() {
  const doc = getActiveDoc();
  if (!doc) return;

  const page = await doc.pdfJsDoc.getPage(state.currentPage);
  const viewport = page.getViewport({ scale: state.zoom * 1.5 });
  const cssViewport = page.getViewport({ scale: state.zoom });
  state.pageViewport = cssViewport;

  const canvas = els.pdfCanvas;
  const context = canvas.getContext('2d');

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${cssViewport.width}px`;
  canvas.style.height = `${cssViewport.height}px`;

  els.pageWrapper.style.width = `${cssViewport.width}px`;
  els.pageWrapper.style.height = `${cssViewport.height}px`;

  await page.render({ canvasContext: context, viewport: viewport }).promise;

  els.pageDisplay.textContent = `Page ${state.currentPage} / ${doc.numPages}`;
  els.btnPrevPage.disabled = state.currentPage <= 1;
  els.btnNextPage.disabled = state.currentPage >= doc.numPages;
  els.valZoom.textContent = `${Math.round(state.zoom * 100)}%`;

  renderOverlayItems();
}

function changePage(newPage) {
  const doc = getActiveDoc();
  if (!doc || newPage < 1 || newPage > doc.numPages) return;
  state.currentPage = newPage;
  selectItem(null);
  renderCurrentPage();
}

function setZoom(newZoom) {
  const clamped = Math.max(0.4, Math.min(2.5, newZoom));
  state.zoom = clamped;
  renderCurrentPage();
}

function fitToWidth() {
  if (!state.pageViewport) return;
  const containerWidth = els.viewportContainer.clientWidth - 60;
  const unscaledWidth = state.pageViewport.width / state.zoom;
  const optimalZoom = containerWidth / unscaledWidth;
  setZoom(optimalZoom);
}

function addItemToActiveDoc(type) {
  const doc = getActiveDoc();
  if (!doc) {
    showToast('Please select or upload a PDF document first.', 'error');
    return;
  }

  if (!doc.pageItems[state.currentPage]) {
    doc.pageItems[state.currentPage] = [];
  }

  let baseWidth = 150;
  let baseHeight = 62;
  if (type === 'signature') {
    baseWidth = 85;
    baseHeight = 42;
  }

  const pageDim = (doc.pageDimensions && doc.pageDimensions[state.currentPage]) || { width: 595.28, height: 841.89 };
  const pw = pageDim.width;
  const ph = pageDim.height;
  const count = doc.pageItems[state.currentPage].length;

  const newItem = {
    id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
    type: type,
    x: (pw - baseWidth) / 2 + (count * 15),
    y: (ph - baseHeight) / 2 + (count * 15),
    baseWidth: baseWidth,
    baseHeight: baseHeight,
    scale: 1.0,
    rotation: 0,
    opacity: 1.0,
    imgDataUrl: state.assets[type]
  };

  doc.pageItems[state.currentPage].push(newItem);
  renderOverlayItems();
  selectItem(newItem.id);
  updateQueueUI();
}

function renderOverlayItems() {
  els.overlayLayer.innerHTML = '';
  const doc = getActiveDoc();
  if (!doc) return;

  const items = doc.pageItems[state.currentPage] || [];

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = `placed-item ${item.id === state.selectedItemId ? 'selected' : ''}`;
    el.id = item.id;

    const w = item.baseWidth * item.scale * state.zoom;
    const h = item.baseHeight * item.scale * state.zoom;
    const x = item.x * state.zoom;
    const y = item.y * state.zoom;

    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${item.rotation}deg)`;
    el.style.opacity = item.opacity;

    el.innerHTML = `
      <img src="${item.imgDataUrl}" alt="${item.type}">
      <div class="item-handle-delete" title="Remove">✕</div>
      <div class="item-handle-resize" title="Resize"></div>
    `;

    setupItemInteraction(el, item);
    els.overlayLayer.appendChild(el);
  });
}

function setupItemInteraction(el, item) {
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    selectItem(item.id);

    if (e.target.classList.contains('item-handle-delete')) {
      deleteSelectedItem();
      return;
    }

    if (e.target.classList.contains('item-handle-resize')) {
      startResize(e, item);
      return;
    }

    startDrag(e, item);
  });
}

function startDrag(e, item) {
  e.preventDefault();
  const startMouseX = e.clientX;
  const startMouseY = e.clientY;
  const startItemX = item.x;
  const startItemY = item.y;
  const zoomFactor = state.zoom;

  function onPointerMove(moveEvent) {
    const dx = (moveEvent.clientX - startMouseX) / zoomFactor;
    const dy = (moveEvent.clientY - startMouseY) / zoomFactor;

    item.x = Math.max(0, startItemX + dx);
    item.y = Math.max(0, startItemY + dy);

    const el = document.getElementById(item.id);
    if (el) {
      const curX = item.x * zoomFactor;
      const curY = item.y * zoomFactor;
      el.style.transform = `translate(${curX}px, ${curY}px) rotate(${item.rotation}deg)`;
    }
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function startResize(e, item) {
  e.preventDefault();
  e.stopPropagation();
  const startMouseX = e.clientX;
  const startScale = item.scale;
  const baseW = item.baseWidth;

  function onPointerMove(moveEvent) {
    const dx = (moveEvent.clientX - startMouseX) / state.zoom;
    const newWidth = Math.max(30, (baseW * startScale) + dx);
    const newScale = Math.max(0.3, Math.min(2.5, newWidth / baseW));

    item.scale = parseFloat(newScale.toFixed(2));
    updateInspectorControls(item);

    const el = document.getElementById(item.id);
    if (el) {
      const w = item.baseWidth * item.scale * state.zoom;
      const h = item.baseHeight * item.scale * state.zoom;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    }
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    renderOverlayItems();
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function selectItem(id) {
  state.selectedItemId = id;
  const doc = getActiveDoc();
  const items = doc ? (doc.pageItems[state.currentPage] || []) : [];
  const selected = items.find(it => it.id === id);

  document.querySelectorAll('.placed-item').forEach(el => {
    el.classList.toggle('selected', el.id === id);
  });

  if (selected) {
    els.inspectorGrid.style.display = 'flex';
    els.inspectorEmpty.style.display = 'none';
    updateInspectorControls(selected);
  } else {
    els.inspectorGrid.style.display = 'none';
    els.inspectorEmpty.style.display = 'block';
  }
}

function updateInspectorControls(item) {
  els.sliderScale.value = Math.round(item.scale * 100);
  els.valScale.textContent = `${Math.round(item.scale * 100)}%`;

  els.sliderRotation.value = item.rotation;
  els.valRotation.textContent = `${item.rotation}°`;

  els.sliderOpacity.value = Math.round(item.opacity * 100);
  els.valOpacity.textContent = `${Math.round(item.opacity * 100)}%`;
}

function updateSelectedItem(props) {
  const doc = getActiveDoc();
  if (!doc || !state.selectedItemId) return;
  const items = doc.pageItems[state.currentPage] || [];
  const selected = items.find(it => it.id === state.selectedItemId);
  if (!selected) return;

  Object.assign(selected, props);

  const el = document.getElementById(selected.id);
  if (el) {
    const w = selected.baseWidth * selected.scale * state.zoom;
    const h = selected.baseHeight * selected.scale * state.zoom;
    const x = selected.x * state.zoom;
    const y = selected.y * state.zoom;

    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${selected.rotation}deg)`;
    el.style.opacity = selected.opacity;
  }
}

function placePreset(position) {
  const doc = getActiveDoc();
  if (!doc || !state.selectedItemId) return;
  const items = doc.pageItems[state.currentPage] || [];
  const selected = items.find(it => it.id === state.selectedItemId);
  if (!selected) return;

  const pageDim = (doc.pageDimensions && doc.pageDimensions[state.currentPage]) || { width: 595.28, height: 841.89 };
  const pw = pageDim.width;
  const ph = pageDim.height;
  const itemW = selected.baseWidth * selected.scale;
  const itemH = selected.baseHeight * selected.scale;

  if (position === 'bottom-right') {
    selected.x = pw - itemW - 40;
    selected.y = ph - itemH - 45;
  } else if (position === 'bottom-left') {
    selected.x = 40;
    selected.y = ph - itemH - 45;
  } else if (position === 'center') {
    selected.x = (pw - itemW) / 2;
    selected.y = (ph - itemH) / 2;
  }

  renderOverlayItems();
  selectItem(selected.id);
}

function duplicateToAllPages() {
  const doc = getActiveDoc();
  if (!doc || !state.selectedItemId) return;
  const items = doc.pageItems[state.currentPage] || [];
  const selected = items.find(it => it.id === state.selectedItemId);
  if (!selected) return;

  for (let p = 1; p <= doc.numPages; p++) {
    if (p === state.currentPage) continue;
    if (!doc.pageItems[p]) doc.pageItems[p] = [];
    doc.pageItems[p].push({
      ...selected,
      id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000)
    });
  }

  showToast(`Applied to all ${doc.numPages} pages.`);
}

function duplicateSelectedItem() {
  const doc = getActiveDoc();
  if (!doc || !state.selectedItemId) return;
  const items = doc.pageItems[state.currentPage] || [];
  const selected = items.find(it => it.id === state.selectedItemId);
  if (!selected) return;

  const clone = {
    ...selected,
    id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
    x: selected.x + 15,
    y: selected.y + 15
  };

  items.push(clone);
  renderOverlayItems();
  selectItem(clone.id);
}

function deleteSelectedItem() {
  const doc = getActiveDoc();
  if (!doc || !state.selectedItemId) return;
  doc.pageItems[state.currentPage] = (doc.pageItems[state.currentPage] || []).filter(it => it.id !== state.selectedItemId);
  selectItem(null);
  renderOverlayItems();
}

// 1:1 WYSIWYG PDF Binary Signing using exact page coordinate system
async function generateSignedPdfBytes(doc) {
  try {
    const bytesClone = new Uint8Array(doc.rawBytes.buffer.slice(doc.rawBytes.byteOffset, doc.rawBytes.byteOffset + doc.rawBytes.byteLength));
    const pdfDoc = await PDFLib.PDFDocument.load(bytesClone);
    const pages = pdfDoc.getPages();
    const embeddedImages = {};

    for (let p = 1; p <= pages.length; p++) {
      const items = doc.pageItems[p] || [];
      if (items.length === 0) continue;

      const pdfPage = pages[p - 1];
      const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();

      for (const item of items) {
        if (!embeddedImages[item.type]) {
          const rawBytes = dataURLtoUint8Array(item.imgDataUrl);
          embeddedImages[item.type] = await pdfDoc.embedPng(rawBytes);
        }

        const pngImage = embeddedImages[item.type];

        const drawWidth = item.baseWidth * item.scale;
        const drawHeight = item.baseHeight * item.scale;
        const drawX = item.x;
        // Exact 1:1 conversion from Top-Left (canvas) to Bottom-Left (PDF coordinate space)
        const drawY = pdfHeight - item.y - drawHeight;

        pdfPage.drawImage(pngImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
          opacity: item.opacity,
          rotate: PDFLib.degrees(-item.rotation)
        });
      }
    }

    return await pdfDoc.save();
  } catch (err) {
    console.error('Error generating signed PDF bytes:', err);
    throw err;
  }
}

async function downloadCurrentSignedPdf() {
  const doc = getActiveDoc();
  if (!doc) {
    showToast('No active document to download.', 'error');
    return;
  }

  try {
    showToast(`Signing ${doc.name}...`);
    const signedBytes = await generateSignedPdfBytes(doc);
    const blob = new Blob([signedBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const baseName = doc.name.replace(/\.pdf$/i, '');
    link.download = `${baseName}_signed.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Downloaded ${link.download}`);
  } catch (err) {
    console.error('Error signing document:', err);
    showToast(`Failed to sign document: ${err.message || 'Unknown error'}`, 'error');
  }
}

async function batchSignAndDownloadZip() {
  if (state.documents.length === 0) {
    showToast('No documents in queue to download.', 'error');
    return;
  }

  const total = state.documents.length;
  showProgress('Signing Documents', `Processing 0 of ${total}`, 0);

  try {
    const zip = new JSZip();
    const folder = zip.folder('Signed_Documents');

    for (let i = 0; i < total; i++) {
      const doc = state.documents[i];
      const percent = Math.round(((i) / total) * 100);
      updateProgress(`Signing "${doc.name}" (${i + 1}/${total})`, percent);

      const signedBytes = await generateSignedPdfBytes(doc);
      const baseName = doc.name.replace(/\.pdf$/i, '');
      folder.file(`${baseName}_signed.pdf`, signedBytes);
      
      doc.status = 'signed';
    }

    updateProgress('Creating ZIP archive...', 95);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `TAKA_Signed_Documents_${dateStr}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    hideProgress();
    updateQueueUI();
    showToast(`Completed batch signing for ${total} document(s).`);
  } catch (err) {
    console.error('Batch sign error:', err);
    hideProgress();
    showToast(`Failed to sign documents: ${err.message || 'Unknown error'}`, 'error');
  }
}

function showProgress(title, status, percent) {
  els.progressTitle.textContent = title;
  els.progressStatus.textContent = status;
  els.progressBarFill.style.width = `${percent}%`;
  els.progressPercent.textContent = `${percent}%`;
  els.progressOverlay.style.display = 'flex';
}

function updateProgress(status, percent) {
  els.progressStatus.textContent = status;
  els.progressBarFill.style.width = `${percent}%`;
  els.progressPercent.textContent = `${percent}%`;
}

function hideProgress() {
  els.progressOverlay.style.display = 'none';
}

let toastTimer = null;
function showToast(message, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast show ${type}`;
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
  }, 3500);
}

document.addEventListener('DOMContentLoaded', init);
