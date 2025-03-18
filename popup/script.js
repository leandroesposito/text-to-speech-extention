const ttsVolume = document.querySelector("#volume");
const ttsRate = document.querySelector("#rate");
const voicesCombobox = document.querySelector("#voices");

const textarea = document.querySelector("#text");

const btnPlay = document.querySelector("#btnPlay");
const btnPauseResume = document.querySelector("#btnPauseResume");
const btnStop = document.querySelector("#btnStop");

const progressBar = document.querySelector("#progress");

const btnToggleTheme = document.querySelector(".toggle-theme");

let voices = [];
let speaking = false;

let startIndex = 0;

const progressBarColorSpeaking = "var(--in-progress)";
const progressBarColorPaused = "var(--paused-color)";
const progressBarColorFinished = "var(--accent-color)";

let config = {
  volume: 10,
  rate: 1,
  voice: null,
  darkTheme: false,
};

const synth = window.speechSynthesis;
synth.onvoiceschanged = (_) => {
  loadVoices();
};

voicesCombobox.onchange = (_) => {
  if (synth.speaking) {
    synth.cancel();
  }
  const utterance = newUtterance(voicesCombobox.value);
  synth.speak(utterance);

  config.voice = voicesCombobox.value;
  saveConfig();
};

function saveConfig() {
  browser.storage.local.set({ config }).then(configSaved, onError);
}

async function loadConfig() {
  try {
    let item = await browser.storage.local.get("config");
    gotConfig(item);
  } catch (error) {
    onError(error);
  }
}

function gotConfig(item) {
  if (item.config) {
    config = item.config;
    ttsRate.value = config.rate;
    ttsVolume.value = config.volume;
    if (config.darkTheme) {
      setDarkTheme();
    } else {
      setLightTheme();
    }
  }
  console.log("config", config);
}

function configSaved() {
  console.log("Config saved.", config);
}

function onError(error) {
  console.log(`Error: ${error}`);
}

function newUtterance(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang =
    voicesCombobox[voicesCombobox.selectedIndex].getAttribute("lang");
  utterance.voice = voices.find(
    (voice) =>
      voice.name ===
      voicesCombobox[voicesCombobox.selectedIndex].getAttribute("name")
  );
  // volume must be between 0 and 1
  utterance.volume = config.volume / 10;
  utterance.rate = config.rate;

  return utterance;
}

function highlightCurrentWord(event) {
  const text = textarea.value;
  const start = event.charIndex + startIndex;
  let end = start + text.slice(start).search(/\s/);

  if (end == start - 1) {
    end = text.length;
  }

  textarea.focus();

  textarea.selectionStart = start;
  textarea.selectionEnd = end;

  const progress = Math.floor((start / text.length) * 100);
  if (speaking) progressBar.style.backgroundColor = progressBarColorSpeaking;
  progressBar.style.width = "" + progress + "%";
  progressBar.innerText = "" + progress + "%";
}

function speak(text) {
  if (synth.speaking || synth.pending) synth.cancel();
  const utterance = newUtterance(text);
  utterance.onboundary = highlightCurrentWord;
  utterance.onstart = (_) => {
    speaking = true;
  };
  utterance.onresume = (_) => {
    speaking = true;
  };
  utterance.onpause = (_) => {
    progressBar.style.backgroundColor = progressBarColorPaused;
    speaking = false;
  };
  utterance.onend = (event) => {
    // check if complete, else means speak got cancelled
    if (event.charIndex == event.utterance.text.length) {
      progressBar.innerText = "100%";
      progressBar.style.width = "100%";
      progressBar.style.backgroundColor = progressBarColorFinished;
      // move carret to end
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
    } else {
      progressBar.innerText = "";
      // on [stop] move carret to 0
      textarea.selectionStart = 0;
      textarea.selectionEnd = 0;
    }
    speaking = false;
  };
  utterance.oncancel = (_) => {
    progressBar.innerText = "";
  };
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

function playTextArea() {
  // if carret is at end of textbox, move to 0
  // else start from carret
  startIndex =
    textarea.selectionStart < textarea.value.length
      ? textarea.selectionStart
      : 0;
  text = textarea.value.slice(startIndex);

  speak(text);
}

btnPlay.addEventListener("click", playTextArea);

function saveAndReload() {
  config.volume = ttsVolume.value;
  config.rate = ttsRate.value;
  saveConfig();
  // if not speaking -> ignore
  // only play if speaking
  if (synth.paused || synth.speaking) {
    synth.cancel();
    playTextArea();
  }
}

ttsRate.addEventListener("click", saveAndReload);
ttsVolume.addEventListener("click", saveAndReload);

btnPauseResume.addEventListener("click", (_) => {
  if (synth.paused) {
    synth.resume();
  } else if (synth.speaking) {
    synth.pause();
  }
});

btnStop.addEventListener("click", (_) => {
  if (synth.paused || synth.speaking) {
    synth.cancel();
  }
  progressBar.text = "";
});

btnToggleTheme.addEventListener("click", (_) => {
  if (config.darkTheme) {
    setLightTheme();
    config.darkTheme = false;
  } else {
    setDarkTheme();
    config.darkTheme = true;
  }
  saveConfig();
});

function setDarkTheme() {
  document.body.classList.add("dark-theme");
  btnToggleTheme.textContent = "🌞";
}

function setLightTheme() {
  document.body.classList.remove("dark-theme");
  btnToggleTheme.textContent = "🌙";
}

async function readSelection() {
  let selectedText = await browser.tabs.executeScript({
    code: "document.getSelection().toString()",
  });

  textarea.value = selectedText;
  playTextArea();
}

window.onload = async function () {
  if (synth.getVoices().length > 0) {
    loadVoices();
  }

  await loadConfig();

  if (config.voice !== null) {
    for (let index = 0; index < voices.length; index++) {
      const element = voices[index];
      if (element.name === config.voice) {
        voicesCombobox.value = element.name;
        break;
      }
    }
  }

  readSelection();
};
