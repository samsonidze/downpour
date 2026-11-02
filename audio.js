// browsers block autoplay with sound, so everything starts on the first click
const rainSound = document.getElementById("rain-sound");
const thunderSound = document.getElementById("thunder-sound");
let soundOn = false;

document.body.addEventListener("click", (e) => {
    if (e.target.closest(".controls")) return;
    soundOn = !soundOn;
    if (soundOn) {
        rainSound.volume = 0.5;
        rainSound.play().catch(() => {});
    } else {
        rainSound.pause();
        thunderSound.pause();
    }
    document.body.classList.toggle("sound-on", soundOn);
});

// script.js calls this when a lightning flash starts
function playThunder(strength) {
    if (!soundOn) return;
    thunderSound.currentTime = 0;
    thunderSound.volume = Math.min(1, 0.4 + strength * 0.6);
    thunderSound.play().catch(() => {});
}
