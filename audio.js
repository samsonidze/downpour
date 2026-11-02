// browsers block autoplay with sound, so start it on the first click
const rainSound = document.getElementById("rain-sound");

document.body.addEventListener("click", () => {
    if (rainSound.paused) {
        rainSound.volume = 0.5;
        rainSound.play().catch(() => {});
    } else {
        rainSound.pause();
    }
}, { passive: true });
