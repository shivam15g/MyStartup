function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle || toggle.dataset.initialized) return;
  toggle.dataset.initialized = "true";

  const saved = localStorage.getItem("recmeet-theme");
  if (saved === "light") {
    document.body.classList.add("light");
    toggle.textContent = "Dark Mode";
  }

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    toggle.textContent = isLight ? "Dark Mode" : "Light Mode";
    localStorage.setItem("recmeet-theme", isLight ? "light" : "dark");
  });
}

function initMenuActiveState() {
  const current = document.body.dataset.page || "dashboard";
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === current);
  });
}

function initLectureFilters() {
  const search = document.getElementById("lectureSearch");
  const filter = document.getElementById("lectureFilter");
  const sort = document.getElementById("lectureSort");
  const list = document.querySelector(".lecture-list");
  if (!search || !filter || !sort || !list) return;

  function apply() {
    const searchValue = search.value.trim().toLowerCase();
    const filterValue = filter.value;
    const sortValue = sort.value;
    const cards = Array.from(list.querySelectorAll(".lecture-card"));

    cards.sort((a, b) => {
      if (sortValue === "title") return a.dataset.title.localeCompare(b.dataset.title);
      if (sortValue === "oldest") return a.dataset.date.localeCompare(b.dataset.date);
      return b.dataset.date.localeCompare(a.dataset.date);
    });

    cards.forEach((card) => {
      const title = card.dataset.title.toLowerCase();
      const subject = card.dataset.subject;
      const visible = (!searchValue || title.includes(searchValue)) && (filterValue === "all" || subject === filterValue);
      card.style.display = visible ? "block" : "none";
      list.appendChild(card);
    });
  }

  [search, filter, sort].forEach((el) => {
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  });
  apply();
}

async function initStats() {
  const lectureTarget = document.getElementById("statLectures");
  const studentsTarget = document.getElementById("statStudents");
  const avgTarget = document.getElementById("statAvg");
  
  // Only proceed if these elements exist on the current page (e.g., teacher.html)
  if (!lectureTarget || !studentsTarget || !avgTarget) return;

  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    if (json.message === 'success') {
      lectureTarget.textContent = String(json.data.totalLectures);
      studentsTarget.textContent = String(json.data.totalStudents);
      avgTarget.textContent = String(json.data.avgMarks) + '%';
    }
  } catch(e) {
    console.error('Error fetching stats', e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initMenuActiveState();
  initLectureFilters();
  initStats();
  
  const page = document.body.dataset.page;
  if (page === 'lectures' || page === 'teacher') {
    fetchLectures();
  }
  if (page === 'marks' || page === 'teacher') {
    fetchStudents();
  }
  if (page === 'record') {
    initRecorder();
  }
  if (page === 'student-portal') {
    initStudentPortal();
  }
  if (page === 'ai-doubts') {
    initAIDoubts();
  }
  if (page === 'parent-portal') {
    initParentPortal();
  }
  if (page === 'alerts') {
    initAlerts();
  }
  if (page === 'dashboard') {
    initDashboard();
  }
});

// --- Parent Portal Integration ---
async function initParentPortal() {
  const attTarget = document.getElementById('parentAttendance');
  const marksTarget = document.getElementById('parentMarks');
  const feeTarget = document.getElementById('parentFee');
  
  if (!attTarget || !marksTarget || !feeTarget) return;

  try {
    // Fetch specific student data (Demo: Aarav, ID = 1)
    const res = await fetch('/api/students/1');
    if (res.ok) {
      const json = await res.json();
      attTarget.textContent = json.data.attendance + '%';
      marksTarget.textContent = json.data.marks;
      feeTarget.textContent = json.data.fee_due > 0 ? 'Rs ' + json.data.fee_due : 'Paid';
    }
  } catch(e) {
    console.error('Error fetching parent portal data', e);
  }
}

// --- Alerts Portal Integration ---
async function initAlerts() {
  const dueStudentsTarget = document.getElementById('alertDueStudents');
  const whatsappTarget = document.getElementById('alertWhatsapp');
  const callsTarget = document.getElementById('alertCalls');
  const defaulterList = document.getElementById('defaulterList');
  
  if (!dueStudentsTarget || !whatsappTarget || !callsTarget || !defaulterList) return;

  try {
    // Fetch stats
    const statsRes = await fetch('/api/stats');
    if (statsRes.ok) {
      const json = await statsRes.json();
      dueStudentsTarget.textContent = json.data.studentsDue;
      whatsappTarget.textContent = json.data.whatsappAlerts;
      callsTarget.textContent = json.data.autoCalls;
    }

    // Fetch students to find defaulters
    const studentsRes = await fetch('/api/students');
    if (studentsRes.ok) {
      const json = await studentsRes.json();
      defaulterList.innerHTML = '';
      
      const defaulters = json.data.filter(s => s.fee_due > 0);
      if (defaulters.length === 0) {
        defaulterList.innerHTML = '<li class="list-item"><span>No fee defaulters!</span><span class="pill success">All Clear</span></li>';
      } else {
        defaulters.forEach((s, i) => {
          // Mocking different statuses
          const statusHTML = i % 2 === 0 
            ? '<span class="pill warn">WhatsApp Sent</span>' 
            : '<span class="pill danger">Auto Call Today 7:00 PM</span>';
          
          defaulterList.innerHTML += `
            <li class="list-item">
              <span>${s.name} - Rs ${s.fee_due} due</span>
              ${statusHTML}
            </li>
          `;
        });
      }
    }
  } catch(e) {
    console.error('Error fetching alerts data', e);
  }
}

// --- Main ERP Dashboard Integration ---
async function initDashboard() {
  const whatsappTarget = document.getElementById('dashWhatsapp');
  const callsTarget = document.getElementById('dashCalls');
  const doubtsTarget = document.getElementById('dashDoubts');
  
  if (!whatsappTarget || !callsTarget || !doubtsTarget) return;

  try {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const json = await res.json();
      whatsappTarget.textContent = json.data.whatsappAlerts;
      callsTarget.textContent = json.data.autoCalls;
      doubtsTarget.textContent = json.data.aiDoubts;
    }
  } catch(e) {
    console.error('Error fetching dashboard stats', e);
  }
}

// --- AI Doubts Integration ---
function initAIDoubts() {
  const chatBox = document.getElementById('doubtChatBox');
  const doubtInput = document.getElementById('doubtInput');
  const askBtn = document.getElementById('askDoubtBtn');

  if (!chatBox || !doubtInput || !askBtn) return;

  async function handleAsk() {
    const question = doubtInput.value.trim();
    if (!question) return;

    // 1. Append student message
    chatBox.innerHTML += `<div class="msg student">${question}</div>`;
    doubtInput.value = '';
    
    // Auto-scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;

    // Optional: show a "Typing..." indicator
    const typingId = 'typing-' + Date.now();
    chatBox.innerHTML += `<div class="msg ai" id="${typingId}"><em>AI is thinking...</em></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
      const res = await fetch('/api/doubts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      if (!res.ok) throw new Error('Network error');
      
      const json = await res.json();
      if (json.message === 'success') {
        chatBox.innerHTML += `<div class="msg ai">${json.data.reply}</div>`;
      }
    } catch(e) {
      console.error('Error asking doubt', e);
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();
      chatBox.innerHTML += `<div class="msg ai" style="background: var(--danger); color: white;">Sorry, I could not process that request right now. Check if backend is running.</div>`;
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  askBtn.addEventListener('click', handleAsk);
  
  // Allow Enter key to submit
  doubtInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAsk();
  });
}

// --- Student Portal Integration ---
async function initStudentPortal() {
  const lecturesTarget = document.getElementById('studentTotalLectures');
  const scoreTarget = document.getElementById('studentScore');
  const gridTarget = document.querySelector('.student-grid');
  
  if (!lecturesTarget || !scoreTarget || !gridTarget) return;

  try {
    // 1. Fetch overall stats to get total lectures
    const statsRes = await fetch('/api/stats');
    if (statsRes.ok) {
      const statsJson = await statsRes.json();
      lecturesTarget.textContent = statsJson.data.totalLectures;
    }

    // 2. Fetch specific student data (Demo: Aarav, ID = 1)
    const studentRes = await fetch('/api/students/1');
    if (studentRes.ok) {
      const studentJson = await studentRes.json();
      scoreTarget.textContent = studentJson.data.marks;
    }

    // 3. Fetch all students to render Top Performing list
    const allStudentsRes = await fetch('/api/students');
    if (allStudentsRes.ok) {
      const allStudentsJson = await allStudentsRes.json();
      gridTarget.innerHTML = '';
      
      // Photos for demo purposes
      const photos = [
        "https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=800&q=80"
      ];

      allStudentsJson.data.forEach((s, index) => {
        // use modulo operator to cycle through photos
        const photo = photos[index % photos.length];
        // randomize attendance just for visual demo
        const attendance = Math.floor(Math.random() * (98 - 85 + 1) + 85); 
        
        gridTarget.innerHTML += `
          <article class="student-card">
            <img class="student-photo" src="${photo}" alt="${s.name}" />
            <div class="student-card-body">
              <strong>${s.name}</strong>
              <span class="muted">Score: ${s.marks} • Attendance: ${attendance}%</span>
            </div>
          </article>
        `;
      });
    }
  } catch(e) {
    console.error('Error initializing student portal', e);
  }
}

// --- Backend API Integration ---

async function fetchLectures() {
  try {
    const res = await fetch('/api/lectures');
    if (!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    if (json.message === 'success') {
      renderLectures(json.data);
    }
  } catch(e) {
    console.error('Error fetching lectures', e);
  }
}

function renderLectures(lectures) {
  const list = document.querySelector(".lecture-list");
  if (!list) return;
  list.innerHTML = '';
  lectures.forEach(l => {
    // Basic date formatting
    const d = new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    list.innerHTML += `
      <div class="lecture-card" data-title="${l.title}" data-date="${l.date}" data-subject="${l.subject}">
        <strong>${l.title}</strong>
        <div class="lecture-meta">
          <span>Date: ${d}</span>
          <div class="btn-group">
            <a class="btn btn-primary" href="${l.url}" target="_blank" style="text-decoration:none;">View</a>
            <button class="btn btn-dark">Download</button>
          </div>
        </div>
      </div>
    `;
  });
  // Re-initialize filters after rendering new DOM elements
  initLectureFilters();
  initStats();
}

async function fetchStudents() {
  try {
    const res = await fetch('/api/students');
    if (!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    if (json.message === 'success') {
      renderStudents(json.data);
    }
  } catch(e) {
    console.error('Error fetching students', e);
  }
}

function renderStudents(students) {
  // Try to find the specific tbody in marks page
  const page = document.body.dataset.page;
  if (page !== 'marks') return; // Only render student table on marks page for now
  
  const tbody = document.querySelector("table tbody");
  if (!tbody) return;
  tbody.innerHTML = '';
  students.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td><input type="number" id="marks-${s.id}" value="${s.marks}" style="width: 80px; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 6px; border-radius: 4px;" /></td>
        <td><button class="btn btn-success" onclick="updateMarks(${s.id})">Update</button></td>
      </tr>
    `;
  });
}

async function updateMarks(id) {
  const marksInput = document.getElementById(`marks-${id}`);
  if(!marksInput) return;
  const newMarks = parseInt(marksInput.value, 10);
  try {
    const res = await fetch(`/api/students/${id}/marks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marks: newMarks })
    });
    if (!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    if (json.message === 'success') {
      // Optional: show a small toast/alert
      const btn = document.querySelector(`button[onclick="updateMarks(${id})"]`);
      const originalText = btn.textContent;
      btn.textContent = 'Saved!';
      setTimeout(() => { btn.textContent = originalText; }, 2000);
    }
  } catch(e) {
    console.error('Error updating marks', e);
    alert('Failed to update marks. Make sure backend is running.');
  }
}

// --- Form Submissions ---
document.addEventListener("DOMContentLoaded", () => {
  const lectureForm = document.getElementById('lectureForm');
  if (lectureForm) {
    lectureForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('lecTitle').value;
      const date = document.getElementById('lecDate').value;
      const subject = document.getElementById('lecSubject').value;
      const url = document.getElementById('lecUrl').value;

      try {
        const res = await fetch('/api/lectures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, date, subject, url })
        });
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();
        if (json.message === 'success') {
          alert('Lecture uploaded successfully!');
          lectureForm.reset();
        }
      } catch(e) {
        console.error('Error uploading lecture', e);
        alert('Failed to upload lecture.');
      }
    });
  }
});

// --- Live Recording Studio Integration ---
function initRecorder() {
  const btnCamera = document.getElementById('btnToggleCamera');
  const btnScreen = document.getElementById('btnShareScreen');
  const btnStart = document.getElementById('btnStartRecord');
  const btnStop = document.getElementById('btnStopRecord');
  const screenPreview = document.getElementById('screenPreview');
  const cameraPreview = document.getElementById('cameraPreview');
  const downloadArea = document.getElementById('downloadArea');
  const downloadLink = document.getElementById('downloadLink');

  let cameraStream = null;
  let screenStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];

  if (!btnCamera) return;

  btnCamera.addEventListener('click', async () => {
    try {
      if (!cameraStream) {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        cameraPreview.srcObject = cameraStream;
        cameraPreview.style.display = 'block';
        btnCamera.textContent = 'Turn Off Camera';
        btnCamera.classList.replace('btn-primary', 'btn-danger');
      } else {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
        cameraPreview.srcObject = null;
        cameraPreview.style.display = 'none';
        btnCamera.textContent = 'Turn On Camera';
        btnCamera.classList.replace('btn-danger', 'btn-primary');
      }
    } catch(e) {
      console.error('Camera error', e);
      alert('Could not access camera/mic.');
    }
  });

  btnScreen.addEventListener('click', async () => {
    try {
      if (!screenStream) {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenPreview.srcObject = screenStream;
        btnScreen.textContent = 'Stop Sharing';
        btnScreen.classList.replace('btn-dark', 'btn-danger');
        btnStart.disabled = false;

        // Listen for user stopping screen share via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }
    } catch(e) {
      console.error('Screen share error', e);
    }
  });

  function stopScreenShare() {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
    }
    screenPreview.srcObject = null;
    btnScreen.textContent = 'Share Screen';
    btnScreen.classList.replace('btn-danger', 'btn-dark');
    btnStart.disabled = true;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      btnStop.click();
    }
  }

  btnStart.addEventListener('click', () => {
    if (!screenStream) return;
    recordedChunks = [];
    downloadArea.style.display = 'none';

    try {
      mediaRecorder = new MediaRecorder(screenStream, { mimeType: 'video/webm' });
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = 'Lecture_' + Date.now() + '.webm';
        downloadArea.style.display = 'block';
      };

      mediaRecorder.start();
      btnStart.disabled = true;
      btnStop.disabled = false;
      screenPreview.style.border = '4px solid var(--danger)';
    } catch(e) {
      console.error('Recording error', e);
      alert('Your browser does not support recording this format.');
    }
  });

  btnStop.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      btnStart.disabled = false;
      btnStop.disabled = true;
      screenPreview.style.border = '1px solid var(--border)';
    }
  });
}

// --- SPA Router and Global Recorder ---

function setupSPA() {
  document.body.addEventListener('click', async (e) => {
    const link = e.target.closest('a.menu-item');
    if (!link) return;
    
    e.preventDefault();
    const url = link.href;
    const pageData = link.dataset.page;

    try {
      const res = await fetch(url);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const newLayout = doc.querySelector('.layout');
      if (newLayout) {
        document.querySelector('.layout').replaceWith(newLayout);
        document.title = doc.title;
        document.body.dataset.page = pageData;
        window.history.pushState({ page: pageData }, '', url);
        
        // Update active menu state
        document.querySelectorAll('.menu-item').forEach(item => {
          item.classList.toggle('active', item.dataset.page === pageData);
        });

        // Re-initialize scripts for the newly injected page
        reInit(pageData);
      }
    } catch(err) {
      console.error('SPA route failed', err);
      window.location.href = url; // fallback
    }
  });

  window.addEventListener('popstate', () => {
    window.location.reload();
  });
}

function reInit(page) {
  initThemeToggle();
  initLectureFilters();
  initStats();
  
  if (page === 'lectures' || page === 'teacher') fetchLectures();
  if (page === 'marks' || page === 'teacher') fetchStudents();
  if (page === 'record') attachRecordFormListener();
  if (page === 'student-portal') initStudentPortal();
  if (page === 'ai-doubts') initAIDoubts();
  if (page === 'parent-portal') initParentPortal();
  if (page === 'alerts') initAlerts();
  if (page === 'dashboard') initDashboard();
  if (page === 'whiteboard') initWhiteboard();
}

function attachRecordFormListener() {
  const lectureForm = document.getElementById('lectureForm');
  if (lectureForm) {
    // Remove existing listener if any to prevent duplicates
    const newForm = lectureForm.cloneNode(true);
    lectureForm.replaceWith(newForm);
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('lecTitle').value;
      const date = document.getElementById('lecDate').value;
      const subject = document.getElementById('lecSubject').value;
      const lecClass = document.getElementById('lecClass').value;
      const url = document.getElementById('lecUrl').value;
      try {
        const res = await fetch('/api/lectures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, date, subject, class: lecClass, url })
        });
        if (res.ok) {
          alert('Lecture saved successfully!');
          newForm.reset();
        }
      } catch(err) {
        console.error(err);
      }
    });
  }
}

function injectGlobalRecorder() {
  const widget = document.createElement('div');
  widget.className = 'global-recorder-studio';
  widget.id = 'globalRecorder';
  widget.innerHTML = `
    <div class="recorder-handle" id="gDrag">
      <span class="rec-dot" id="gDot"></span>
      <span id="gStatusText">RecMeet Studio</span>
      <div class="handle-dots">⋮⋮</div>
    </div>
    <div class="recorder-content">
      <div class="preview-area">
        <video id="globalScreenPreview" autoplay muted></video>
        <video id="globalCameraPreview" autoplay muted></video>
        <div class="crop-indicator" id="cropInd">Area Selected</div>
      </div>
      <div class="recorder-actions">
        <div class="top-group" style="display: flex; gap: 8px; width: 100%;">
          <button class="action-btn" id="gBtnScreen" style="flex: 1;">🖥️ Screen</button>
          <button class="action-btn" id="gBtnCamera" style="flex: 1;">📷 Camera</button>
          <button class="action-btn" id="gBtnCrop" style="flex: 1;">✂️ Crop</button>
        </div>
        <div class="main-group">
          <button class="btn btn-success" id="gBtnStart" disabled>● Start Recording</button>
          <button class="btn btn-warn" id="gBtnPause" style="display:none;">⏸ Pause</button>
          <button class="btn btn-danger" id="gBtnStop" disabled>■ Stop</button>
        </div>
        <div class="studio-hint">Select Screen then click Start</div>
      </div>
      <div id="gDownloadArea" style="display:none; margin-top:10px;">
        <a id="gDownloadLink" class="btn btn-primary" style="width:100%; display:block; text-align:center;">Download Video</a>
      </div>
    </div>
    <canvas id="recCanvas" style="display:none;"></canvas>
  `;
  document.body.appendChild(widget);

  // --- Draggable Logic ---
  let isDragging = false;
  let offset = { x: 0, y: 0 };
  const dragHandle = document.getElementById('gDrag');
  
  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = widget.getBoundingClientRect();
    offset.x = e.clientX - rect.left;
    offset.y = e.clientY - rect.top;
    widget.style.transition = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    widget.style.left = (e.clientX - offset.x) + 'px';
    widget.style.top = (e.clientY - offset.y) + 'px';
    widget.style.bottom = 'auto';
    widget.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => { 
    isDragging = false; 
    widget.style.transition = 'all 0.3s ease';
  });

  const btnScreen = document.getElementById('gBtnScreen');
  const btnCamera = document.getElementById('gBtnCamera');
  const btnCrop = document.getElementById('gBtnCrop');
  const btnStart = document.getElementById('gBtnStart');
  const btnPause = document.getElementById('gBtnPause');
  const btnStop = document.getElementById('gBtnStop');
  const cameraPreview = document.getElementById('globalCameraPreview');
  const screenPreview = document.getElementById('globalScreenPreview');
  const downloadArea = document.getElementById('gDownloadArea');
  const downloadLink = document.getElementById('gDownloadLink');
  const statusText = document.getElementById('gStatusText');

  let cameraStream = null;
  let screenStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let cropArea = null;

  btnScreen.addEventListener('click', async () => {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenPreview.srcObject = screenStream;
      btnStart.disabled = false;
      btnScreen.style.background = 'var(--primary)';
      screenStream.getVideoTracks()[0].onended = () => btnStop.click();
    } catch(e) { console.error(e); }
  });

  // --- Crop Area Selection ---
  btnCrop.addEventListener('click', () => {
    if (cropArea) {
      cropArea = null;
      btnCrop.style.background = '';
      return;
    }
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.3); z-index:20000; cursor:crosshair;';
    document.body.appendChild(overlay);

    let startX, startY, selector;
    overlay.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      selector = document.createElement('div');
      selector.style.cssText = 'position:fixed; border:2px dashed #4f7cff; background:rgba(79,124,255,0.1); pointer-events:none;';
      overlay.appendChild(selector);
    });

    overlay.addEventListener('mousemove', (e) => {
      if (!selector) return;
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      selector.style.left = x + 'px';
      selector.style.top = y + 'px';
      selector.style.width = w + 'px';
      selector.style.height = h + 'px';
    });

    overlay.addEventListener('mouseup', (e) => {
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      if (w > 10 && h > 10) {
        cropArea = { x, y, w, h };
        btnCrop.style.background = 'var(--primary)';
      }
      document.body.removeChild(overlay);
    });
  });

  btnCamera.addEventListener('click', async () => {
    if (!cameraStream) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        cameraPreview.srcObject = cameraStream;
        cameraPreview.style.display = 'block';
        btnCamera.style.background = 'var(--danger)';
      } catch(e) { console.error(e); }
    } else {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
      cameraPreview.style.display = 'none';
      btnCamera.style.background = '';
    }
  });

  btnStart.addEventListener('click', () => {
    if (!screenStream) return;
    try {
      recordedChunks = [];
      downloadArea.style.display = 'none';
      
      let streamToRecord = screenStream;
      
      if (cropArea) {
        const canvas = document.getElementById('recCanvas');
        const ctx = canvas.getContext('2d');
        const video = screenPreview;
        video.play();
        
        canvas.width = cropArea.w;
        canvas.height = cropArea.h;
        
        function drawFrame() {
          if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
          ctx.drawImage(video, cropArea.x, cropArea.y, cropArea.w, cropArea.h, 0, 0, cropArea.w, cropArea.h);
          requestAnimationFrame(drawFrame);
        }
        drawFrame();
        streamToRecord = canvas.captureStream(30);
      }

      mediaRecorder = new MediaRecorder(streamToRecord, { mimeType: 'video/webm' });
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'RecMeet_' + Date.now() + '.webm';
        downloadArea.style.display = 'block';
        statusText.textContent = 'Studio Idle';
        document.getElementById('gDot').classList.remove('pulsing');
      };

      mediaRecorder.start();
      btnStart.style.display = 'none';
      btnPause.style.display = 'inline-block';
      btnPause.disabled = false;
      btnStop.disabled = false;
      statusText.textContent = 'Recording...';
      document.getElementById('gDot').classList.add('pulsing');
    } catch(e) { console.error(e); }
  });

  btnPause.addEventListener('click', () => {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      btnPause.textContent = '▶ Resume';
      statusText.textContent = 'Paused';
    } else if (mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      btnPause.textContent = '⏸ Pause';
      statusText.textContent = 'Recording...';
    }
  });

  btnStop.addEventListener('click', () => {
    if (mediaRecorder) mediaRecorder.stop();
    btnStart.style.display = 'inline-block';
    btnPause.style.display = 'none';
    btnStop.disabled = true;
    btnPause.textContent = '⏸ Pause';
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
      cameraPreview.style.display = 'none';
    }
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
      document.getElementById('globalScreenPreview').srcObject = null;
    }
  });
}
}

// --- Whiteboard Integration ---
function initWhiteboard() {
  const canvas = document.getElementById('drawingBoard');
  const container = document.getElementById('wbContainer');
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  // Tools state
  let currentMode = 'draw'; // 'draw', 'erase', 'highlight'
  let currentColor = document.getElementById('wbColor') ? document.getElementById('wbColor').value : '#ffffff';
  let currentSize = document.getElementById('wbSize') ? parseInt(document.getElementById('wbSize').value) : 3;

  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    // Calculate position accounting for scrolling
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function startPosition(e) {
    isDrawing = true;
    const pos = getMousePos(e);
    lastX = pos.x;
    lastY = pos.y;
  }

  function endPosition() {
    isDrawing = false;
    ctx.beginPath();
  }

  function draw(e) {
    if (!isDrawing) return;
    
    // Prevent scrolling when drawing on touch devices
    if(e.type === 'touchmove') e.preventDefault();
    
    const pos = getMousePos(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    
    if (currentMode === 'erase') {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = currentSize * 5;
      ctx.globalAlpha = 1;
    } else if (currentMode === 'highlight') {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize * 3;
      ctx.globalAlpha = 0.3; // Highlighter transparency
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;
      ctx.globalAlpha = 1;
    }
    
    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
  }

  canvas.addEventListener('mousedown', startPosition);
  canvas.addEventListener('mouseup', endPosition);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('touchstart', startPosition, { passive: false });
  canvas.addEventListener('touchend', endPosition);
  canvas.addEventListener('touchmove', draw, { passive: false });

  // Tool bindings
  const btnDraw = document.getElementById('wbBtnDraw');
  const btnErase = document.getElementById('wbBtnErase');
  const btnHighlight = document.getElementById('wbBtnHighlight');
  const btnClear = document.getElementById('wbBtnClear');
  const btnGrid = document.getElementById('wbBtnGrid');
  const inputColor = document.getElementById('wbColor');
  const inputSize = document.getElementById('wbSize');

  function updateButtons() {
    [btnDraw, btnErase, btnHighlight].forEach(b => {
      if(b) b.classList.replace('btn-primary', 'btn-dark');
      if(b) b.classList.replace('btn-secondary', 'btn-dark');
    });
    if (currentMode === 'draw' && btnDraw) btnDraw.classList.replace('btn-dark', 'btn-primary');
    if (currentMode === 'erase' && btnErase) btnErase.classList.replace('btn-dark', 'btn-primary');
    if (currentMode === 'highlight' && btnHighlight) btnHighlight.classList.replace('btn-dark', 'btn-secondary');
  }

  if (btnDraw) btnDraw.addEventListener('click', () => { currentMode = 'draw'; updateButtons(); });
  if (btnErase) btnErase.addEventListener('click', () => { currentMode = 'erase'; updateButtons(); });
  if (btnHighlight) btnHighlight.addEventListener('click', () => { currentMode = 'highlight'; updateButtons(); });
  
  if (btnClear) btnClear.addEventListener('click', () => { 
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
  });
  
  if (btnGrid) btnGrid.addEventListener('click', () => {
    if (canvas.style.backgroundImage) {
      canvas.style.backgroundImage = '';
    } else {
      canvas.style.backgroundImage = 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)';
      canvas.style.backgroundSize = '30px 30px';
    }
  });

  if (inputColor) inputColor.addEventListener('input', (e) => { currentColor = e.target.value; });
  if (inputSize) inputSize.addEventListener('input', (e) => { currentSize = parseInt(e.target.value); });
  
  // Board Type Toggle
  const btnType = document.getElementById('wbBtnType');
  if (btnType) {
    btnType.addEventListener('click', () => {
      const isBlack = container.classList.toggle('black-mode');
      if (isBlack) {
        container.style.backgroundColor = '#0b1622';
        currentColor = '#ffffff';
        if (inputColor) inputColor.value = '#ffffff';
      } else {
        container.style.backgroundColor = '#ffffff';
        currentColor = '#000000';
        if (inputColor) inputColor.value = '#000000';
      }
    });
  }

  updateButtons();
}

// Start everything up
setupSPA();
injectGlobalRecorder();
