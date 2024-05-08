const ttsVolume = document.querySelector("#volume");
const ttsRate = document.querySelector("#rate");
const voicesCombobox = document.querySelector("#voices");

const textarea = document.querySelector("#text");

const btnPlay = document.querySelector("#btnPlay");
const btnPauseResume = document.querySelector("#btnPauseResume");
const btnStop = document.querySelector("#btnStop");

const progressBar = document.querySelector("#progress");

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
