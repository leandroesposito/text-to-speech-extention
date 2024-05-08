const ttsVolume = document.querySelector("#volume");
const ttsRate = document.querySelector("#rate");
const voicesCombobox = document.querySelector("#voices");

const textarea = document.querySelector("#text");

const btnPlay = document.querySelector("#btnPlay");
const btnPauseResume = document.querySelector("#btnPauseResume");
const btnStop = document.querySelector("#btnStop");

const progressBar = document.querySelector("#progress");

const englishWords = new Set(["the", "be", "of", "and", "a", "in", "to", "have", "it", "to", "for", "I", "that", "you", "he", "on", "with", "do", "at", "by", "not", "this", "but", "from", "they", "his", "that", "she", "or", "which", "as", "we", "an", "say", "will", "would", "can", "if", "their", "go", "what", "there", "all", "get", "her", "make", "who", "as", "out", "up", "see", "know", "time", "take", "them", "some", "could", "so", "him", "year", "into", "its", "then", "think", "my", "come", "than", "more", "about", "now", "last", "your", "me", "no", "other", "give", "just", "should", "these", "people", "also", "well", "any", "only", "new", "very", "when", "may", "way", "look", "like", "use", "her", "such", "how", "because", "when", "as", "good", "find",]);
const spanishWords = new Set(["de", "la", "que", "el", "en", "y", "a", "los", "se", "del", "las", "un", "por", "con", "no", "una", "su", "para", "es", "al", "lo", "como", "más", "o", "pero", "sus", "le", "ha", "me", "si", "sin", "sobre", "este", "ya", "entre", "cuando", "todo", "esta", "ser", "son", "dos", "también", "fue", "había", "era", "muy", "años", "hasta", "desde", "está", "mi", "porque", "qué", "sólo", "han", "yo", "hay", "vez", "puede", "todos", "así", "nos", "ni", "parte", "tiene", "él", "uno", "donde", "bien", "tiempo", "mismo", "ese", "ahora", "cada", "e", "vida", "otro", "después", "te", "otros", "aunque", "esa", "eso", "hace", "otra", "gobierno", "tan", "durante", "siempre", "día", "tanto", "ella", "tres", "sí", "dijo", "sido", "gran", "país", "según", "menos",]);

let voices = [];
let speaking = false;

let start_index = 0;

const progressBarColorSpeaking = "var(--light-orange)";
const progressBarColorPaused = "var(--light-yellow)";
const progressBarColorFinished = "var(--orange)";

const synth = window.speechSynthesis;
synth.onvoiceschanged = _ => {
    loadVoices();
}

const countMatches = (wordList, text) => {
    const words = text.split(" ");

    return words.filter(word => wordList.has(word)).length;
};

voicesCombobox.onchange = _ => {
    if (synth.speaking) {
        synth.cancel();
    }
    const utterance = newUtterance(voicesCombobox.value);
    synth.speak(utterance);
    localStorage.setItem("voice", voicesCombobox.value)
}

function newUtterance(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voicesCombobox[voicesCombobox.selectedIndex].getAttribute("lang");
    utterance.voice = voices.find(voice => voice.name === voicesCombobox[voicesCombobox.selectedIndex].getAttribute("name"));
    // volume must be between 0 and 1
    utterance.volume = ttsVolume.value / 10;
    utterance.rate = ttsRate.value;

    return utterance;
}

function highlightCurrentWord(event) {
    const text = textarea.value;
    const start = event.charIndex + start_index;
    let end = start + text.slice(start).search(/\s/);

    if (end == start - 1) {
        end = text.length;
    }

    textarea.focus();

    textarea.selectionStart = start;
    textarea.selectionEnd = end;

    const progress = Math.floor(start / text.length * 100);
    if (speaking)
        progressBar.style.backgroundColor = progressBarColorSpeaking;
    progressBar.style.width = "" + progress + "%";
    progressBar.innerText = "" + progress + "%";
};


function speak(text) {
    if (synth.speaking || synth.pending) synth.cancel();
    const utterance = newUtterance(text);
    utterance.onboundary = highlightCurrentWord;
    utterance.onstart = _ => {
        speaking = true;
    }
    utterance.onresume = _ => {
        speaking = true;
    }
    utterance.onpause = _ => {
        progressBar.style.backgroundColor = progressBarColorPaused;
        speaking = false;
    }
    utterance.onend = event => {
        // check if complete, else means speak got cancelled
        if (event.charIndex == event.utterance.text.length) {
            progressBar.innerText = "100%";
            progressBar.style.width = "100%";
            progressBar.style.backgroundColor = progressBarColorFinished;
            // move carret to end
            textarea.selectionStart = textarea.value.length;
            textarea.selectionEnd = textarea.value.length;
        }
        else {
            progressBar.innerText = "";
            // on [stop] move carret to 0
            textarea.selectionStart = 0;
            textarea.selectionEnd = 0;
        }
        speaking = false;
    }
    utterance.oncancel = _ => {
        progressBar.innerText = "";
    }
    synth.speak(utterance);
}

function loadVoices() {
    voices = synth.getVoices();
    for (let i = 0; i < voices.length; i++) {
        const voice = voices[i];
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = voice.lang + " " + voice.name;
        option.setAttribute("lang", voice.lang);
        option.setAttribute("name", voice.name);
        voicesCombobox.appendChild(option);
    }
}

const play = () => {
    // if carret is at end of textbox, move to 0
    // else start from carret
    start_index = textarea.selectionStart < textarea.value.length ? textarea.selectionStart : 0;
    text = textarea.value.slice(start_index);

    // Disable temporary, this generate problems for other languages
    // selectVoice(text);
    speak(text);
};

btnPlay.addEventListener("click", play);

const reload = () => {
    // if not speaking -> ignore
    // only play if speaking
    if (synth.paused || synth.speaking) {
        synth.cancel();
        play();
    }
}

ttsRate.addEventListener("click", reload);
ttsVolume.addEventListener("click", reload);

btnPauseResume.addEventListener("click", _ => {
    if (synth.paused) {
        synth.resume();
    }
    else if (synth.speaking) {
        synth.pause();
    }
})

btnStop.addEventListener("click", _ => {
    if (synth.paused || synth.speaking) {
        synth.cancel();
    }
    progressBar.text = "";
})

const selectVoice = (text) => {
    let lang = "es";
    if (countMatches(englishWords, text) > countMatches(spanishWords, text)) {
        lang = "en";
    }

    for (let index = 0; index < voices.length; index++) {
        const element = voices[index];
        if (element.lang.startsWith(lang)) {
            voicesCombobox.value = element.name;
            break;
        }
    }
};

async function getDocumentSelectedText() {
    let text = await browser
        .tabs
        .executeScript({
            code: "document.getSelection().toString()"
        });

    textarea.value = text;
    play();
}

window.onload = function () {
    if (synth.getVoices().length > 0) {
        loadVoices();
    };

    previousSelectedVoice = localStorage.getItem("voice");
    if (previousSelectedVoice !== null) {
        for (let index = 0; index < voices.length; index++) {
            const element = voices[index];
            if (element.name === previousSelectedVoice) {
                voicesCombobox.value = element.name;
                break;
            }
        }
    }


    getDocumentSelectedText();
};
