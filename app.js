// Theme Toggle Functionality
const themeToggleButton = document.getElementById("theme-toggle");
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggleButton.textContent = "☀️";
} else {
    themeToggleButton.textContent = "🌙";
}

themeToggleButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
        themeToggleButton.textContent = "☀️";
        localStorage.setItem("theme", "dark");
    } else {
        themeToggleButton.textContent = "🌙";
        localStorage.setItem("theme", "light");
    }
});

// Variables for word display
let words = [];
let index = 0;
let isPaused = false;
let wordInterval;
let currentSpeed = 300;

// Calculate time remaining
function calculateTimeRemaining() {
    const totalWords = words.length;
    const wordsLeft = totalWords - index;
    const timeRemainingInSeconds = (wordsLeft / currentSpeed) * 60;

    const minutes = Math.floor(timeRemainingInSeconds / 60);
    const seconds = Math.round(timeRemainingInSeconds % 60);

    return { minutes, seconds };
}

// Update time remaining in the UI
function updateTimeRemainingUI() {
    const { minutes, seconds } = calculateTimeRemaining();
    const timeRemainingElement = document.getElementById("timeRemaining");
    if (timeRemainingElement) {
        timeRemainingElement.textContent = `Time Remaining: ${minutes} minutes, ${seconds} seconds`;
    }
}

// Store the input text and navigate to display page
function startDisplay() {
    const textInput = document.getElementById("textInput").value.trim();
    if (!textInput) {
        alert("Please enter or upload text first!");
        return;
    }

    localStorage.setItem("inputText", textInput); // Store text for the display page
    window.location.href = "display.html"; // Navigate to display.html
}

// Display words
function displayWords() {
    const displayArea = document.getElementById("displayArea");
    if (!isPaused && index < words.length) {
        displayArea.textContent = words[index];
        updatePreview(); // Update the preview with the highlighted word
        index++;
        updateTimeRemainingUI(); // Update time remaining dynamically
    } else if (index >= words.length) {
        clearInterval(wordInterval);
    }
}

function togglePause() {
    isPaused = !isPaused;
    if (!isPaused) {
        wordInterval = setInterval(displayWords, getIntervalFromSpeed(currentSpeed));
    } else {
        clearInterval(wordInterval);
    }
}

function backTenWords() {
    index = Math.max(0, index - 10);
    isPaused = false;
    clearInterval(wordInterval);
    wordInterval = setInterval(displayWords, getIntervalFromSpeed(currentSpeed));
}

function getIntervalFromSpeed(wpm) {
    return (60 / wpm) * 1000;
}

function updatePreview() {
    const previewContainer = document.getElementById("previewContainer");
    const previewText = words
        .map((word, i) =>
            i === index ? `<span class="highlighted-word">${word}</span>` : word
        )
        .join(" ");
    previewContainer.innerHTML = previewText;

    // Locate the highlighted word
    const highlightedWord = previewContainer.querySelector(".highlighted-word");
    if (highlightedWord) {
        // Get the preview container dimensions
        const containerRect = previewContainer.getBoundingClientRect();

        // Get the highlighted word position
        const wordRect = highlightedWord.getBoundingClientRect();

        // Calculate the middle of the preview container
        const containerMiddle = containerRect.top + containerRect.height / 2;

        // Check if the word is below the middle
        if (wordRect.top > containerMiddle) {
            // Smoothly scroll to position the word just below the middle
            const scrollAmount = wordRect.top - containerMiddle + highlightedWord.offsetHeight;
            previewContainer.scrollBy({ top: scrollAmount, behavior: "smooth" });
        }
    }
}

// File Reading Functionality
function readTextFromPDF(pdfFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const pdfData = new Uint8Array(e.target.result);
        pdfjsLib
            .getDocument(pdfData)
            .promise.then((pdf) => {
                let textContent = "";
                const numPages = pdf.numPages;

                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                    pdf.getPage(pageNum).then((page) => {
                        page.getTextContent().then((text) => {
                            text.items.forEach((item) => {
                                textContent += item.str + " ";
                            });

                            if (pageNum === numPages) {
                                document.getElementById("textInput").value = textContent;
                            }
                        });
                    });
                }
            })
            .catch((error) => {
                console.error("Error reading PDF:", error);
            });
    };
    reader.readAsArrayBuffer(pdfFile);
}

// Retrieve and start display (for display.html)
function initializeDisplayPage() {
    const storedText = localStorage.getItem("inputText");

    if (storedText) {
        // Parse text into words and start the display
        words = storedText.match(/\w+['\w]*[.,!?;:]?/g) || [];
        index = 0;
        isPaused = false;

        document.getElementById("displayArea").textContent = ""; // Clear display area
        updatePreview(); // Update the preview text
        updateTimeRemainingUI(); // Initialize time remaining UI

        clearInterval(wordInterval);
        wordInterval = setInterval(displayWords, getIntervalFromSpeed(currentSpeed));
    } else {
        console.error("No text found in localStorage.");
        document.getElementById("displayArea").textContent =
            "No text available. Please return to the main page and enter text.";
    }
}

// Event Listeners (index.html)
if (document.getElementById("fileInput")) {
    document.getElementById("fileInput").addEventListener("change", function (event) {
        const file = event.target.files[0];

        if (file) {
            const fileType = file.type;

            // Handle PNG images using Tesseract.js
            if (fileType === "image/png") {
                Tesseract.recognize(file, "eng", { logger: (m) => console.log(m) })
                    .then(({ data: { text } }) => {
                        document.getElementById("textInput").value = text;
                    })
                    .catch((error) => {
                        console.error("Error during OCR processing:", error);
                    });
            }
            // Handle PDFs using pdf.js
            else if (fileType === "application/pdf") {
                readTextFromPDF(file);
            } else {
                alert("Please upload a PNG image or PDF file.");
            }
        }
    });

    document.getElementById("displayButton").addEventListener("click", startDisplay);
}

// Event Listeners (display.html)
if (document.getElementById("displayArea")) {
    initializeDisplayPage();
    document.getElementById("pauseResumeButton").addEventListener("click", togglePause);
    document.getElementById("backTenWordsButton").addEventListener("click", backTenWords);

    document.getElementById("speedSlider").addEventListener("input", function (event) {
        currentSpeed = event.target.value;
        document.getElementById("currentSpeed").textContent = `${currentSpeed} WPM`;

        if (!isPaused) {
            clearInterval(wordInterval);
            wordInterval = setInterval(displayWords, getIntervalFromSpeed(currentSpeed));
        }
    });
}
