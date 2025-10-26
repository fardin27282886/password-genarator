// Character Sets
const AMBIGUOUS_CHARS = 'l1Io0'; // Characters to exclude for ambiguity
const standardLowercase = 'abcdefghijklmnopqrstuvwxyz';
const standardUppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const customNumbers = '67895432'; 
const customSymbols = '@#$%';      

// DOM Elements
const passwordOutput = document.getElementById('password-output');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const messageBox = document.getElementById('message-box');
const lengthSlider = document.getElementById('length');
const lengthValueDisplay = document.getElementById('length-value');

// Strength Bar Elements
const strengthIndicator = document.querySelector('.strength-indicator');
const strengthBarFill = document.querySelector('.bar-fill');
const strengthLabel = document.getElementById('strength-label');
const entropyValueDisplay = document.getElementById('entropy-value');

// Character set checkboxes
const includeUppercase = document.getElementById('include-uppercase');
const includeLowercase = document.getElementById('include-lowercase');
const excludeAmbiguous = document.getElementById('exclude-ambiguous');

// Debounce function to limit how often generatePassword is called
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Event Listeners (using debounced function for slider/checkboxes)
const debouncedGenerate = debounce(generatePassword, 150);
generateBtn.addEventListener('click', generatePassword);
copyBtn.addEventListener('click', copyPassword);

lengthSlider.addEventListener('input', () => {
    lengthValueDisplay.textContent = lengthSlider.value;
    lengthSlider.setAttribute('aria-valuetext', `Password length is ${lengthSlider.value}`);
    debouncedGenerate(); 
});

includeUppercase.addEventListener('change', debouncedGenerate);
includeLowercase.addEventListener('change', debouncedGenerate);
excludeAmbiguous.addEventListener('change', debouncedGenerate);


// --- Core Generator Logic (Uses Crypto API) ---

function generatePassword() {
    const PASSWORD_LENGTH = parseInt(lengthSlider.value);
    let allChars = '';
    let password = '';
    
    let currentLowercase = standardLowercase;
    let currentUppercase = standardUppercase;
    let currentNumbers = customNumbers;
    let currentSymbols = customSymbols;

    // 1. Handle Ambiguous Character Exclusion
    if (excludeAmbiguous.checked) {
        const regex = new RegExp(`[${AMBIGUOUS_CHARS}]`, 'g');
        currentLowercase = currentLowercase.replace(regex, '');
        currentUppercase = currentUppercase.replace(regex, '');
        currentNumbers = currentNumbers.replace(regex, '');
        currentSymbols = currentSymbols.replace(regex, '');
    }

    // 2. Build the final character pool (L)
    if (includeLowercase.checked) allChars += currentLowercase;
    if (includeUppercase.checked) allChars += currentUppercase;
    allChars += currentNumbers; // Mandatory
    allChars += currentSymbols; // Mandatory

    if (allChars.length === 0) {
        passwordOutput.value = 'Error: No characters available.';
        updateStrength(0, 0);
        return;
    }
    
    // 3. Ensure diversity (at least one from each selected set)
    const requiredChars = [];
    if (includeLowercase.checked && currentLowercase.length > 0) requiredChars.push(getRandomChar(currentLowercase));
    if (includeUppercase.checked && currentUppercase.length > 0) requiredChars.push(getRandomChar(currentUppercase));
    if (currentNumbers.length > 0) requiredChars.push(getRandomChar(currentNumbers));
    if (currentSymbols.length > 0) requiredChars.push(getRandomChar(currentSymbols));
    
    // 4. Filling the rest of the password using CSRNG
    const remainingLength = PASSWORD_LENGTH - requiredChars.length;
    const charArray = new Uint32Array(remainingLength);
    window.crypto.getRandomValues(charArray); // Cryptographically Secure Random Number Generation

    for (let i = 0; i < remainingLength; i++) {
        const randomIndex = charArray[i] % allChars.length;
        password += allChars[randomIndex];
    }

    // 5. Combining, shuffling, and output
    password = requiredChars.join('') + password;
    password = shuffleString(password);
    password = password.slice(0, PASSWORD_LENGTH);
    
    passwordOutput.value = password;
    
    // 6. Update Strength with Entropy
    updateStrength(PASSWORD_LENGTH, allChars.length); 
    showMessage('Password regenerated securely!', 'info');
}

// --- Entropy and Strength Logic (Advanced) ---

function updateStrength(length, poolSize) {
    let entropy = 0;
    if (poolSize > 0) {
        // Entropy (bits) = Length * log2(Pool Size)
        entropy = length * (Math.log2(poolSize));
    }

    entropy = parseFloat(entropy.toFixed(2));
    entropyValueDisplay.textContent = entropy;

    let strength = '';
    let color = '';
    let width = 0;
    const RECOMMENDED_ENTROPY = 128; // Industry recommendation for strong passwords
    const MAX_VISUAL_ENTROPY = 160; // Max visual range

    // Set strength based on entropy threshold
    if (length < 8) {
        strength = 'Too Short';
        color = 'var(--strength-very-weak)';
        width = 5;
    } else if (entropy < 40) {
        strength = 'Weak';
        color = 'var(--strength-very-weak)';
        width = (entropy / MAX_VISUAL_ENTROPY) * 100;
    } else if (entropy < 80) {
        strength = 'Medium';
        color = 'var(--strength-medium)';
        width = (entropy / MAX_VISUAL_ENTROPY) * 100;
    } else if (entropy < RECOMMENDED_ENTROPY) {
        strength = 'Strong';
        color = 'var(--strength-strong)';
        width = (entropy / MAX_VISUAL_ENTROPY) * 100;
    } else {
        strength = 'Excellent';
        color = 'var(--strength-very-strong)';
        width = 100; // Visual bar maxes out
    }

    // Apply changes to DOM and ARIA
    strengthLabel.textContent = strength;
    strengthLabel.style.color = color;
    strengthBarFill.style.width = width + '%';
    strengthBarFill.style.backgroundColor = color;
    strengthIndicator.setAttribute('aria-valuenow', Math.round(entropy));
}

// --- Crypto Helper Functions ---

function getRandomChar(charSet) {
    if (charSet.length === 0) return '';
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const randomIndex = array[0] % charSet.length;
    return charSet[randomIndex];
}

function shuffleString(str) {
    const array = str.split('');
    const randomIndexes = new Uint32Array(array.length);
    window.crypto.getRandomValues(randomIndexes);

    for (let i = array.length - 1; i > 0; i--) {
        const j = randomIndexes[i] % (i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
}

// --- Copy and Message Logic ---

function copyPassword() {
    const password = passwordOutput.value;
    if (password === '' || password.includes('Click') || password.includes('Error')) {
        showMessage('Nothing to copy. Generate a password first!', 'error');
        return;
    }

    navigator.clipboard.writeText(password).then(() => {
        showMessage('Password copied to clipboard!', 'success');
    }).catch(() => {
        passwordOutput.select();
        document.execCommand('copy');
        showMessage('Password copied (Fallback)!', 'info');
    });
}

function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.classList.remove('show');
    
    let bgColor, textColor;
    if (type === 'error') {
        bgColor = '#ffcdd2'; textColor = '#e53935'; 
    } else if (type === 'success') {
        bgColor = '#e8f5e9'; textColor = '#43a047';
    } else { // info
        bgColor = '#e0f7fa'; textColor = '#00bcd4';
    }
    
    messageBox.style.backgroundColor = bgColor;
    messageBox.style.color = textColor;

    setTimeout(() => {
        messageBox.classList.add('show');
    }, 10);

    setTimeout(() => {
        messageBox.classList.remove('show');
    }, 3000);
}

// Initial Call to run generator on page load
window.onload = generatePassword;