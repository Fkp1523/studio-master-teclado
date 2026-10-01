// Função para mover e exibir o teclado virtual logo abaixo do container pai desejado
function mostrarTecladoAbaixoDe(idElementoPai) {
    const estudio = document.getElementById('estudio-interativo');
    const elementoPai = document.getElementById(idElementoPai);
    if (estudio && elementoPai) {
        elementoPai.insertAdjacentElement('afterend', estudio);
        estudio.classList.remove('oculto');
    }
}

function ocultarTecladoEPauta() {
    const estudio = document.getElementById('estudio-interativo');
    if (estudio) estudio.classList.add('oculto');
}

const btnFecharTeclado = document.getElementById('btn-fechar-teclado');
if (btnFecharTeclado) {
    btnFecharTeclado.addEventListener('click', () => {
        modoEscalaAtivo = false;
        ocultarTecladoEPauta();
    });
}

// ==========================================
// 1. MOTOR DE ÁUDIO, TIMBRES & DELAY
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const frequencias = {
    "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, 
    "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, 
    "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
    "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, 
    "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, 
    "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77
};

const timbreSelect = document.getElementById('timbre-select');
const toggleDelay = document.getElementById('toggle-delay');

const delayNode = audioCtx.createDelay();
delayNode.delayTime.value = 0.35;
const feedbackNode = audioCtx.createGain();
feedbackNode.gain.value = 0.4;

delayNode.connect(feedbackNode);
feedbackNode.connect(delayNode);
delayNode.connect(audioCtx.destination);

function tocarSom(frequencia) {
    const timbre = timbreSelect ? timbreSelect.value : 'piano';
    const usarDelay = toggleDelay && toggleDelay.checked;
    const agora = audioCtx.currentTime;
    
    const osc1 = audioCtx.createOscillator();
    const ganho = audioCtx.createGain();
    const filtro = audioCtx.createBiquadFilter();

    if (usarDelay) {
        const mixNode = audioCtx.createGain();
        mixNode.gain.value = 0.6;
        ganho.connect(mixNode);
        mixNode.connect(audioCtx.destination);
        ganho.connect(delayNode);
    }

    if (timbre === 'orgao') {
        osc1.type = 'sawtooth';
        filtro.type = 'lowpass';
        filtro.frequency.value = 2200;
        
        ganho.gain.setValueAtTime(0, agora);
        ganho.gain.linearRampToValueAtTime(0.15, agora + 0.05);
        ganho.gain.setValueAtTime(0.15, agora + 1.2);
        ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 1.6);

        osc1.connect(filtro);
        filtro.connect(ganho);
        if (!usarDelay) ganho.connect(audioCtx.destination);

        osc1.start(agora);
        osc1.stop(agora + 1.6);

    } else if (timbre === 'synth') {
        osc1.type = 'square';
        filtro.type = 'bandpass';
        filtro.frequency.value = 1800;

        ganho.gain.setValueAtTime(0, agora);
        ganho.gain.linearRampToValueAtTime(0.12, agora + 0.02);
        ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 1.0);

        osc1.connect(filtro);
        filtro.connect(ganho);
        if (!usarDelay) ganho.connect(audioCtx.destination);

        osc1.start(agora);
        osc1.stop(agora + 1.0);

    } else {
        const osc2 = audioCtx.createOscillator();
        filtro.type = 'lowpass';
        filtro.frequency.value = 1400;

        osc1.type = 'sine';
        osc1.frequency.value = frequencia;

        osc2.type = 'triangle';
        osc2.frequency.value = frequencia * 2;

        ganho.gain.setValueAtTime(0, agora);
        ganho.gain.linearRampToValueAtTime(0.22, agora + 0.04);
        ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 1.8);

        osc1.connect(filtro);
        osc2.connect(filtro);
        filtro.connect(ganho);
        if (!usarDelay) ganho.connect(audioCtx.destination);

        osc1.start(agora);
        osc2.start(agora);
        osc1.stop(agora + 1.8);
        osc2.stop(agora + 1.8);
    }
}


// ==========================================
// 2. PAUTA MUSICAL GRÁFICA (CANVAS)
// ==========================================
const staffCanvas = document.getElementById('sheet-staff');
let notasAtivasNoCanvas = [];

function desenharPauta() {
    if (!staffCanvas) return;
    const ctx = staffCanvas.getContext('2d');
    ctx.clearRect(0, 0, staffCanvas.width, staffCanvas.height);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    const espacamento = 10;
    const inicioY = 16;

    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(30, inicioY + (i * espacamento));
        ctx.lineTo(staffCanvas.width - 30, inicioY + (i * espacamento));
        ctx.stroke();
    }

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 20px Arial';
    ctx.fillText("𝄞", 40, inicioY + 24);

    ctx.fillStyle = '#22c55e';
    notasAtivasNoCanvas.forEach((n, index) => {
        ctx.beginPath();
        ctx.arc(120 + (index * 35), inicioY + 20, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(n, 114 + (index * 35), inicioY + 42);
        ctx.fillStyle = '#22c55e';
    });
}
desenharPauta();


// ==========================================
// 3. LOOPER DE GRAVAÇÃO E REPRODUÇÃO
// ==========================================
let isRecording = false;
let recordedEvents = [];
let recordStartTime = 0;
let isPlayingLoop = false;
let loopTimeouts = [];

const btnRec = document.getElementById('btn-rec');
const btnPlayLoop = document.getElementById('btn-play-loop');
const btnStopLoop = document.getElementById('btn-stop-loop');
const looperStatus = document.getElementById('looper-status');

if (btnRec) {
    btnRec.addEventListener('click', () => {
        modoEscalaAtivo = false;
        mostrarTecladoAbaixoDe('secao-looper');
        isRecording = true;
        isPlayingLoop = false;
        recordedEvents = [];
        recordStartTime = performance.now();
        if (looperStatus) looperStatus.textContent = "🔴 A gravar... Toca no teclado!";
        if (btnRec) btnRec.style.background = "linear-gradient(135deg, #f87171, #ef4444)";
    });
}

if (btnPlayLoop) {
    btnPlayLoop.addEventListener('click', () => {
        modoEscalaAtivo = false;
        mostrarTecladoAbaixoDe('secao-looper');
        if (recordedEvents.length === 0) {
            if (looperStatus) looperStatus.textContent = "⚠️ Nenhuma nota gravada!";
            return;
        }
        isRecording = false;
        isPlayingLoop = true;
        if (looperStatus) looperStatus.textContent = "▶ A reproduzir Loop em ciclo...";

        loopTimeouts.forEach(t => clearTimeout(t));
        loopTimeouts = [];

        const executarLoop = () => {
            if (!isPlayingLoop) return;
            const duracaoTotal = recordedEvents[recordedEvents.length - 1].time + 1000;

            recordedEvents.forEach(ev => {
                const t = setTimeout(() => {
                    if (isPlayingLoop) processarNotaPressionada(ev.notaCompleta, true);
                }, ev.time);
                loopTimeouts.push(t);
            });

            const proximoCiclo = setTimeout(executarLoop, duracaoTotal);
            loopTimeouts.push(proximoCiclo);
        };

        executarLoop();
    });
}

if (btnStopLoop) {
    btnStopLoop.addEventListener('click', () => {
        isRecording = false;
        isPlayingLoop = false;
        loopTimeouts.forEach(t => clearTimeout(t));
        loopTimeouts = [];
        if (looperStatus) looperStatus.textContent = "Estado do Looper: Parado";
        if (btnRec) btnRec.style.background = "linear-gradient(135deg, #ef4444, #991b1b)";
        ocultarTecladoEPauta();
    });
}


// ==========================================
// 4. METRÓNOMO INTEGRADO
// ==========================================
let metronomeTimer = null;
let isMetronomeActive = false;
const bpmSlider = document.getElementById('bpm-slider');
const bpmVal = document.getElementById('bpm-val');
const btnMetronome = document.getElementById('btn-metronome');
const metronomeBeat = document.getElementById('metronome-beat');

function tocarClickMetronomo() {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.value = 1000;
    osc.connect(g);
    g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.05);

    if (metronomeBeat) {
        metronomeBeat.textContent = "🟢";
        setTimeout(() => { metronomeBeat.textContent = "⚪"; }, 100);
    }
}

if (btnMetronome) {
    btnMetronome.addEventListener('click', () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const bpm = parseInt(bpmSlider.value);
        const intervalo = (60 / bpm) * 1000;

        if (isMetronomeActive) {
            clearInterval(metronomeTimer);
            isMetronomeActive = false;
            btnMetronome.textContent = "▶️";
            btnMetronome.style.background = "linear-gradient(135deg, #10b981, #059669)";
        } else {
            tocarClickMetronomo();
            metronomeTimer = setInterval(tocarClickMetronomo, intervalo);
            isMetronomeActive = true;
            btnMetronome.textContent = "⏹️";
            btnMetronome.style.background = "linear-gradient(135deg, #ef4444, #b91c1c)";
        }
    });
}

if (bpmSlider) {
    bpmSlider.addEventListener('input', (e) => {
        const bpm = e.target.value;
        if (bpmVal) bpmVal.textContent = bpm;
        if (isMetronomeActive) {
            clearInterval(metronomeTimer);
            const intervalo = (60 / bpm) * 1000;
            metronomeTimer = setInterval(tocarClickMetronomo, intervalo);
        }
    });
}


// ==========================================
// 5. CAMPO HARMÓNICO & TREINO DE ESCALAS
// ==========================================
const camposHarmonicos = {
    "C":  ["C (I)", "Dm (ii)", "Em (iii)", "F (IV)", "G (V)", "Am (vi)", "Bdim (vii°)"],
    "C#": ["C# (I)", "D#m (ii)", "E#m (iii)", "F# (IV)", "G# (V)", "A#m (vi)", "B#dim (vii°)"],
    "D":  ["D (I)", "Em (ii)", "F#m (iii)", "G (IV)", "A (V)", "Bm (vi)", "C#dim (vii°)"],
    "D#": ["D# (I)", "Fm (ii)", "Gm (iii)", "G# (IV)", "A# (V)", "Cm (vi)", "Ddim (vii°)"],
    "E":  ["E (I)", "F#m (ii)", "G#m (iii)", "A (IV)", "B (V)", "C#m (vi)", "D#dim (vii°)"],
    "F":  ["F (I)", "Gm (ii)", "Am (iii)", "Bb (IV)", "C (V)", "Dm (vi)", "Edim (vii°)"],
    "F#": ["F# (I)", "G#m (ii)", "A#m (iii)", "B (IV)", "C# (V)", "D#m (vi)", "E#dim (vii°)"],
    "G":  ["G (I)", "Am (ii)", "Bm (iii)", "C (IV)", "D (V)", "Em (vi)", "F#dim (vii°)"],
    "G#": ["G# (I)", "A#m (ii)", "Cm (iii)", "C# (IV)", "D# (V)", "Fm (vi)", "Gdim (vii°)"],
    "A":  ["A (I)", "Bm (ii)", "C#m (iii)", "D (IV)", "E (V)", "F#m (vi)", "G#dim (vii°)"],
    "A#": ["A# (I)", "Cm (ii)", "Dm (iii)", "D# (IV)", "F (V)", "Gm (vi)", "Adim (vii°)"],
    "B":  ["B (I)", "C#m (ii)", "D#m (iii)", "E (IV)", "F# (V)", "G#m (vi)", "A#dim (vii°)"]
};

const escalasMaiores = {
    "C":  ["C", "D", "E", "F", "G", "A", "B"],
    "C#": ["C#", "D#", "F", "F#", "G#", "A#", "C"],
    "D":  ["D", "E", "F#", "G", "A", "B", "C#"],
    "D#": ["D#", "F", "G", "G#", "A#", "C", "D"],
    "E":  ["E", "F#", "G#", "A", "B", "C#", "D#"],
    "F":  ["F", "G", "A", "A#", "C", "D", "E"],
    "F#": ["F#", "G#", "A#", "B", "C#", "D#", "F"],
    "G":  ["G", "A", "B", "C", "D", "E", "F#"],
    "G#": ["G#", "A#", "C", "C#", "D#", "F", "G"],
    "A":  ["A", "B", "C#", "D", "E", "F#", "G#"],
    "A#": ["A#", "C", "D", "D#", "F", "G", "A"],
    "B":  ["B", "C#", "D#", "E", "F#", "G#", "A#"]
};

let modoEscalaAtivo = false;
let escalaAtualNotas = [];
let passoEscalaIndex = 0;
let tomEscalaAtual = "C";

const btnGerar = document.getElementById('btn-gerar');
const btnTreinarEscala = document.getElementById('btn-treinar-escala');
const btnReiniciarEscala = document.getElementById('btn-reiniciar-escala');
const selectTonalidade = document.getElementById('tonalidade');
const divResultado = document.getElementById('resultado-harmonia');

if (btnGerar) {
    btnGerar.addEventListener('click', () => {
        const tomEscolhido = selectTonalidade.value;
        const acordes = camposHarmonicos[tomEscolhido];
        divResultado.innerHTML = `<div class="badge-tom">🎵 Campo Harmónico: ${tomEscolhido} Maior</div><br>` + acordes.join(' - ');
    });
}

function iniciarTreinoEscala() {
    mostrarTecladoAbaixoDe('secao-campo');
    tomEscalaAtual = selectTonalidade.value;
    escalaAtualNotas = escalasMaiores[tomEscalaAtual] || [];
    passoEscalaIndex = 0;
    modoEscalaAtivo = true;
    desafioAtualObj = null; 
    modoMusicaAtivo = false;

    divResultado.innerHTML = `<div class="badge-tom">🎓 Treino da Escala: ${tomEscalaAtual} Maior</div><br>` +
        `Toca a 1ª nota da escala: <span style="color:#22c55e; font-size:1.25rem; font-weight:bold;">${escalaAtualNotas[0]}</span>`;
}

if (btnTreinarEscala) btnTreinarEscala.addEventListener('click', iniciarTreinoEscala);

if (btnReiniciarEscala) {
    btnReiniciarEscala.addEventListener('click', () => {
        if (!modoEscalaAtivo) {
            iniciarTreinoEscala();
        } else {
            passoEscalaIndex = 0;
            divResultado.innerHTML = `<div class="badge-tom">🔄 Treino Reiniciado: ${tomEscalaAtual} Maior</div><br>` +
                `Toca a 1ª nota da escala: <span style="color:#22c55e; font-size:1.25rem; font-weight:bold;">${escalaAtualNotas[0]}</span>`;
        }
    });
}


// ==========================================
// 6. DICIONÁRIO E BANCO DE ACORDES UNIVERSAL
// ==========================================
const notasCromaticas = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function transporNota(notaBase, semitons) {
    let index = notasCromaticas.indexOf(notaBase);
    if (index === -1) return notaBase;
    let novoIndex = (index + semitons + 12) % 12;
    return notasCromaticas[novoIndex];
}

function construirAcordePorTom(tom, tipoAcorde) {
    let raizIndex = notasCromaticas.indexOf(tom);
    if (raizIndex === -1) raizIndex = 0;

    let intervalos = {
        "maior": [0, 4, 7],
        "menor": [0, 3, 7],
        "dim": [0, 3, 6],
        "7M": [0, 4, 7, 11],
        "7": [0, 4, 7, 10],
        "m7": [0, 3, 7, 10]
    };

    let ints = intervalos[tipoAcorde] || intervalos["maior"];
    return ints.map(semitons => {
        let notaNome = notasCromaticas[(raizIndex + semitons) % 12];
        return notaNome;
    });
}

const dicionarioAcordesUniversal = {
    // Para cada tom, definimos as fórmulas dos graus
};

// ==========================================
// 7. MODO MÚSICA INTERATIVO COM TRANSPOSIÇÃO COMPLETA
// ==========================================
const modelosProgressao = {
    "pop": { nome: "Pop Ballad (I - vi - IV - V)", graus: [ {grau: "I", tipo: "maior", offset: 0}, {grau: "vi", tipo: "menor", offset: 9}, {grau: "IV", tipo: "maior", offset: 5}, {grau: "V", tipo: "maior", offset: 7} ] },
    "praise_4": { nome: "Praise / Pop (I - V - vi - IV)", graus: [ {grau: "I", tipo: "maior", offset: 0}, {grau: "V", tipo: "maior", offset: 7}, {grau: "vi", tipo: "menor", offset: 9}, {grau: "IV", tipo: "maior", offset: 5} ] },
    "gospel_worship": { nome: "Gospel Worship (I - IV - vi - V)", graus: [ {grau: "I", tipo: "maior", offset: 0}, {grau: "IV", tipo: "maior", offset: 5}, {grau: "vi", tipo: "menor", offset: 9}, {grau: "V", tipo: "maior", offset: 7} ] },
    "sertanejo": { nome: "Sertanejo Cadência (I - V - IV - V)", graus: [ {grau: "I", tipo: "maior", offset: 0}, {grau: "V", tipo: "maior", offset: 7}, {grau: "IV", tipo: "maior", offset: 5}, {grau: "V", tipo: "maior", offset: 7} ] },
    "pop_50s": { nome: "Doo-Wop 50s (I - vi - ii - V)", graus: [ {grau: "I", tipo: "maior", offset: 0}, {grau: "vi", tipo: "menor", offset: 9}, {grau: "ii", tipo: "menor", offset: 2}, {grau: "V", tipo: "maior", offset: 7} ] },
    "bossa": { nome: "Bossa Nova / MPB (ii7 - V7 - I7M)", graus: [ {grau: "ii7", tipo: "m7", offset: 2}, {grau: "V7", tipo: "7", offset: 7}, {grau: "I7M", tipo: "7M", offset: 0} ] },
    "neosoul": { nome: "Neo-Soul R&B (vi7 - V7 - IV7M)", graus: [ {grau: "vi7", tipo: "m7", offset: 9}, {grau: "V7", tipo: "7", offset: 7}, {grau: "IV7M", tipo: "7M", offset: 5} ] }
};

let progAtualKey = "pop";
let tomAtualProg = "C";
let progressaoAtivaAcordes = [];
let progressaoAtivaGraus = [];
let passoProgIndex = 0;
let notasNotasProgAluno = [];
let modoMusicaAtivo = false;

const selectProg = document.getElementById('progressao-select');
const selectTomProg = document.getElementById('tom-progressao');
const btnIniciarProg = document.getElementById('btn-iniciar-prog');
const resProg = document.getElementById('resultado-progressao');

function gerarAcordesDaProgressao() {
    const modelo = modelosProgressao[progAtualKey];
    let raizIndex = notasCromaticas.indexOf(tomAtualProg);
    if (raizIndex === -1) raizIndex = 0;

    progressaoAtivaAcordes = [];
    progressaoAtivaGraus = [];

    modelo.graus.forEach(g => {
        let notaRaizAcorde = notasCromaticas[(raizIndex + g.offset) % 12];
        let nomeVisual = notaRaizAcorde;
        if (g.tipo === "menor") nomeVisual += "m";
        if (g.tipo === "dim") nomeVisual += "dim";
        if (g.tipo === "7M") nomeVisual += "7M";
        if (g.tipo === "7") nomeVisual += "7";
        if (g.tipo === "m7") nomeVisual += "m7";

        progressaoAtivaAcordes.push({
            nome: nomeVisual,
            notas: construirAcordePorTom(notaRaizAcorde, g.tipo)
        });
        progressaoAtivaGraus.push(g.grau);
    });
}

function atualizarTextoProgresso() {
    const modelo = modelosProgressao[progAtualKey];
    const acordeObj = progressaoAtivaAcordes[passoProgIndex];
    const grauAlvo = progressaoAtivaGraus[passoProgIndex];
    
    if (resProg) {
        resProg.innerHTML = 
            `<div class="badge-tom">🎵 Tom: ${tomAtualProg} Maior | ${modelo.nome}</div><br>` +
            `<span style="color: #cbd5e1; font-size: 0.85rem;">Passo ${passoProgIndex + 1} de ${progressaoAtivaAcordes.length}</span><br><br>` +
            `Grau: <span style="color:#facc15; font-size:1.1rem; font-weight:bold;">${grauAlvo}</span> &nbsp;|&nbsp; ` +
            `Toca o Acorde: <span style="color:#22c55e; font-size:1.35rem; font-weight:800;">${acordeObj.nome}</span>`;
    }
}

if (selectProg) {
    selectProg.addEventListener('change', (e) => {
        progAtualKey = e.target.value;
        passoProgIndex = 0;
        modoMusicaAtivo = false;
        gerarAcordesDaProgressao();
        if (resProg) {
            resProg.innerHTML = `<div class="badge-tom">🎵 Tom: ${tomAtualProg} Maior</div><br>Estilo selecionado. Clica em "Iniciar Progressão"!`;
        }
    });
}

if (selectTomProg) {
    selectTomProg.addEventListener('change', (e) => {
        tomAtualProg = e.target.value;
        passoProgIndex = 0;
        modoMusicaAtivo = false;
        gerarAcordesDaProgressao();
        if (resProg) {
            resProg.innerHTML = `<div class="badge-tom">🎵 Tom Alterado: ${tomAtualProg} Maior</div><br>Clica em "Iniciar Progressão"!`;
        }
    });
}

if (btnIniciarProg) {
    btnIniciarProg.addEventListener('click', () => {
        modoEscalaAtivo = false;
        gerarAcordesDaProgressao();
        mostrarTecladoAbaixoDe('secao-progressoes');
        passoProgIndex = 0;
        notasNotasProgAluno = [];
        modoMusicaAtivo = true;
        btnIniciarProg.textContent = "A tocar a música...";
        atualizarTextoProgresso();
    });
}


// ==========================================
// 8. PROCESSAMENTO CENTRAL DE NOTAS & SUPORTE MIDI BLOCADO
// ==========================================
function processarNotaPressionada(notaCompleta, veioDoLooper = false) {
    const notaBase = notaCompleta.replace(/[0-9]/g, ''); 

    if (frequencias[notaCompleta]) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        tocarSom(frequencias[notaCompleta]);
    }

    notasAtivasNoCanvas.push(notaBase);
    if (notasAtivasNoCanvas.length > 5) notasAtivasNoCanvas.shift();
    desenharPauta();

    const teclaEl = document.querySelector(`.tecla[data-nota="${notaCompleta}"]`);

    if (isRecording && !veioDoLooper) {
        const tempoDecorrido = performance.now() - recordStartTime;
        recordedEvents.push({ notaCompleta, time: tempoDecorrido });
    }

    // A) MODO TREINO DE ESCALAS
    if (modoEscalaAtivo && !veioDoLooper) {
        const notaEsperada = escalaAtualNotas[passoEscalaIndex];

        if (notaBase === notaEsperada) {
            if (teclaEl) {
                teclaEl.classList.add('acerto');
                setTimeout(() => teclaEl.classList.remove('acerto'), 300);
            }
            passoEscalaIndex++;

            if (passoEscalaIndex >= escalaAtualNotas.length) {
                divResultado.innerHTML = `<div class="badge-tom">🎉 Parabéns!</div><br>Concluiste a escala de <strong>${tomEscalaAtual} Maior</strong>!`;
                modoEscalaAtivo = false;
                setTimeout(ocultarTecladoEPauta, 1800);
            } else {
                const proximaNota = escalaAtualNotas[passoEscalaIndex];
                divResultado.innerHTML = `<div class="badge-tom">🎓 Escala: ${tomEscalaAtual} Maior</div><br>Toca a nota: <span style="color:#22c55e; font-size:1.3rem; font-weight:bold;">${proximaNota}</span>`;
            }
        } else {
            if (teclaEl) {
                teclaEl.classList.add('erro');
                setTimeout(() => teclaEl.classList.remove('erro'), 400);
            }
            divResultado.innerHTML = `<div class="badge-tom">❌ Tenta de novo!</div><br>Tocaste <strong>${notaBase}</strong>, mas a correta é <span style="color:#22c55e; font-size:1.2rem; font-weight:bold;">${notaEsperada}</span>.`;
        }
        return;
    }

    if (teclaEl) {
        teclaEl.classList.add('ativa');
        setTimeout(() => teclaEl.classList.remove('ativa'), 200);
    }

    // B) MODO MÚSICA (PROGRESSÕES EM QUALQUER TOM)
    if (modoMusicaAtivo && !veioDoLooper) {
        const acordeObjAlvo = progressaoAtivaAcordes[passoProgIndex];
        const notasEsperadasAlvo = acordeObjAlvo.notas;

        if (!notasNotasProgAluno.includes(notaBase)) {
            notasNotasProgAluno.push(notaBase);
        }

        if (notasNotasProgAluno.length === notasEsperadasAlvo.length) {
            const acertouProg = notasEsperadasAlvo.every(n => notasNotasProgAluno.includes(n)) &&
                                notasNotasProgAluno.every(n => notasEsperadasAlvo.includes(n));

            if (acertouProg) {
                passoProgIndex++;
                notasNotasProgAluno = [];

                if (passoProgIndex >= progressaoAtivaAcordes.length) {
                    if (resProg) resProg.innerHTML = `<div class="badge-tom">🎉 Parabéns!</div><br>Concluiste a progressão em <strong>${tomAtualProg} Maior</strong> com sucesso!`;
                    modoMusicaAtivo = false;
                    if (btnIniciarProg) btnIniciarProg.textContent = "Iniciar Progressão";
                    setTimeout(ocultarTecladoEPauta, 1800);
                } else {
                    atualizarTextoProgresso();
                }
            } else {
                if (resProg) {
                    resProg.innerHTML = `<div class="badge-tom">🎵 Tom: ${tomAtualProg} Maior</div><br><span style="color:#ef4444; font-weight:bold;">❌ Incorreto para o acorde ${acordeObjAlvo.nome}. Tenta novamente!</span>`;
                }
                notasNotasProgAluno = [];
                setTimeout(atualizarTextoProgresso, 1200);
            }
        }
        return; 
    }

    // C) QUIZ ABRANGENTE
    if (desafioAtualObj && !veioDoLooper) {
        if (!notasPressionadasPeloAluno.includes(notaBase)) {
            notasPressionadasPeloAluno.push(notaBase);
        }

        if (notasPressionadasPeloAluno.length === desafioAtualObj.notas.length) {
            const acertou = desafioAtualObj.notas.every(n => notasPressionadasPeloAluno.includes(n)) &&
                            notasPressionadasPeloAluno.every(n => desafioAtualObj.notas.includes(n));

            if (acertou) {
                pontos += timeAttackAtivo ? 30 : 25;
                sequencia += 1;
                if (spanPontos) spanPontos.textContent = pontos;
                if (spanSequencia) spanSequencia.textContent = sequencia;
                atualizarRecordeNoServidor(pontos);

                if (errosPorAcorde[desafioAtualObj.nome] > 1) errosPorAcorde[desafioAtualObj.nome]--;

                if (feedbackDesafio) {
                    feedbackDesafio.innerHTML = `<div class="badge-tom">🎉 Acertaste!</div><br>Excelente! ${desafioAtualObj.nome}`;
                }

                if (!timeAttackAtivo) {
                    setTimeout(ocultarTecladoEPauta, 1500);
                } else {
                    setTimeout(iniciarNovoDesafio, 1200);
                }
            } else {
                sequencia = 0;
                if (spanSequencia) spanSequencia.textContent = sequencia;
                errosPorAcorde[desafioAtualObj.nome] += 2;

                if (feedbackDesafio) {
                    feedbackDesafio.innerHTML = `<div class="badge-tom">❌ Tenta de novo!</div><br>Incorreto para ${desafioAtualObj.nome}.`;
                }
                notasPressionadasPeloAluno = [];
            }
        }
    }
}

document.querySelectorAll('.tecla').forEach(tecla => {
    tecla.addEventListener('click', () => {
        processarNotaPressionada(tecla.getAttribute('data-nota'));
    });
});


// ==========================================
// 9. SUPORTE MIDI FÍSICO COM BUFFER DE ACORDES BLOCADOS
// ==========================================
const midiStatusEl = document.getElementById('midi-status');
const mapaNotasMidi = {
    60: "C4",  61: "C#4", 62: "D4",  63: "D#4", 64: "E4",  65: "F4",  
    66: "F#4", 67: "G4",  68: "G#4", 69: "A4",  70: "A#4", 71: "B4",
    72: "C5",  73: "C#5", 74: "D5",  75: "D#5", 76: "E5",  77: "F5",  
    78: "F#5", 79: "G5",  80: "G#5", 81: "A5",  82: "A#5", 83: "B5"
};

let bufferMidiSimultaneo = [];
let timerBufferMidi = null;

function registrarNotaMidi(nota) {
    if (modoEscalaAtivo) {
        mostrarTecladoAbaixoDe('secao-campo');
        processarNotaPressionada(nota);
    } else {
        bufferMidiSimultaneo.push(nota);
        clearTimeout(timerBufferMidi);
        timerBufferMidi = setTimeout(() => {
            if (modoMusicaAtivo) {
                mostrarTecladoAbaixoDe('secao-progressoes');
            } else {
                mostrarTecladoAbaixoDe('secao-quiz');
            }
            bufferMidiSimultaneo.forEach(n => processarNotaPressionada(n));
            bufferMidiSimultaneo = [];
        }, 50);
    }
}

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, () => {
        if (midiStatusEl) midiStatusEl.textContent = "⚠️ Erro MIDI.";
    });
} else {
    if (midiStatusEl) midiStatusEl.textContent = "⚠️ MIDI não suportado.";
}

function onMIDISuccess(midiAccess) {
    const inputs = midiAccess.inputs.values();
    let nomeDispositivo = "";
    
    for (let input of inputs) {
        nomeDispositivo = input.name;
        input.onmidimessage = (msg) => {
            const [cmd, note, vel] = msg.data;
            if (cmd === 144 && vel > 0 && mapaNotasMidi[note]) {
                registrarNotaMidi(mapaNotasMidi[note]);
            }
        };
    }

    if (midiStatusEl) {
        if (nomeDispositivo) {
            midiStatusEl.textContent = `🎹 MIDI: ${nomeDispositivo}`;
            midiStatusEl.style.color = "#22c55e";
        } else {
            midiStatusEl.textContent = "🔌 Nenhuma porta MIDI ativa.";
            midiStatusEl.style.color = "#f59e0b";
        }
    }

    midiAccess.onstatechange = (e) => {
        if (e.port.type === "input") {
            if (e.port.state === "connected") {
                midiStatusEl.textContent = `🎹 MIDI: ${e.port.name}`;
                midiStatusEl.style.color = "#22c55e";
                e.port.onmidimessage = (msg) => {
                    const [cmd, note, vel] = msg.data;
                    if (cmd === 144 && vel > 0 && mapaNotasMidi[note]) {
                        registrarNotaMidi(mapaNotasMidi[note]);
                    }
                };
            } else {
                midiStatusEl.textContent = "🔌 Teclado MIDI Desconectado.";
                midiStatusEl.style.color = "#f59e0b";
            }
        }
    };
}