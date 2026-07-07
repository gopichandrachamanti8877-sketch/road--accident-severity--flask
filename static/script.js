const imageInput = document.getElementById("imageInput");
const previewWrapper = document.getElementById("previewWrapper");
const previewImage = document.getElementById("previewImage");
const predictBtn = document.getElementById("predictBtn");

const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const resultState = document.getElementById("resultState");
const errorState = document.getElementById("errorState");

const severityBadge = document.getElementById("severityBadge");
const predictionText = document.getElementById("predictionText");
const confidenceText = document.getElementById("confidenceText");
const confidenceFill = document.getElementById("confidenceFill");
const probabilities = document.getElementById("probabilities");

let selectedFile = null;

imageInput.addEventListener("change", () => {
    selectedFile = imageInput.files[0];

    if (!selectedFile) {
        predictBtn.disabled = true;
        previewWrapper.classList.add("hidden");
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        previewImage.src = e.target.result;
        previewWrapper.classList.remove("hidden");
        predictBtn.disabled = false;
        resetResult();
    };

    reader.readAsDataURL(selectedFile);
});

predictBtn.addEventListener("click", async () => {

    if (!selectedFile) return;

    resetResult();

    emptyState.classList.add("hidden");
    loadingState.classList.remove("hidden");

    predictBtn.disabled = true;

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {

        const response = await fetch("/predict", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Prediction failed.");
        }

        showResult(data);

    } catch (err) {

        errorState.textContent = err.message;
        errorState.classList.remove("hidden");

    } finally {

        loadingState.classList.add("hidden");
        predictBtn.disabled = false;

    }

});

function resetResult() {

    emptyState.classList.remove("hidden");

    loadingState.classList.add("hidden");

    resultState.classList.add("hidden");

    errorState.classList.add("hidden");

    probabilities.innerHTML = "";

}

function showResult(data) {

    predictionText.textContent = data.prediction;

    confidenceText.textContent =
        `Confidence: ${data.confidence}%`;

    confidenceFill.style.width =
        `${data.confidence}%`;

    severityBadge.textContent = data.prediction;

    severityBadge.className = "severity-badge";

    if (data.prediction.includes("Minor")) {

        severityBadge.classList.add("minor");

    } else if (data.prediction.includes("Substantial")) {

        severityBadge.classList.add("substantial");

    } else {

        severityBadge.classList.add("critical");

    }

    probabilities.innerHTML = "";

    for (const [label, value] of Object.entries(data.probabilities)) {

        probabilities.innerHTML += `
        <div class="prob-row">
            <div class="prob-label">
                <span>${label}</span>
                <strong>${value}%</strong>
            </div>

            <div class="prob-track">
                <div class="prob-fill" style="width:${value}%"></div>
            </div>
        </div>`;
    }

    emptyState.classList.add("hidden");

    resultState.classList.remove("hidden");

}
