// Function to generate unique permutations of a specified length
function generatePermutations(str, length) {
    const result = [];
    const arr = str.split('');
    const n = arr.length;

    // Recursive function to generate the permutations
    function permute(path, used) {
        if (path.length === length) {
            result.push(path.join(''));
            return;
        }

        for (let i = 0; i < n; i++) {
            if (used[i]) continue; // Skip already used characters
            used[i] = true; // Mark the current character as used
            permute(path.concat(arr[i]), used);
            used[i] = false; // Unmark the character as used for backtracking
        }
    }

    permute([], Array(n).fill(false)); // Start the permutation process
    return result;
}

// Function to count occurrences of permutations
function countOccurrences(permutations) {
    const occurrences = {};
    permutations.forEach((perm) => {
        occurrences[perm] = (occurrences[perm] || 0) + 1;
    });
    return occurrences;
}

// Handle "Generate Permutations" button click
document.getElementById('generateBtn').addEventListener('click', () => {
    let input = document.getElementById('inputText').value.trim();
    const lengthInput = document.getElementById('permutationLength').value.trim();
    const ignoreDuplicates = document.getElementById('toggleDuplicatesBtn').classList.contains('enabled');
    const removeDuplicateWords = document.getElementById('toggleDuplicateWordsBtn').classList.contains('enabled');

    if (!input) {
        document.getElementById('outputSection').innerHTML = "<p>Please enter a valid word or phrase.</p>";
        return;
    }

    if (removeDuplicateWords) {
        // Remove duplicate words
        const words = input.split(/\s+/);
        input = [...new Set(words)].join(' ');
    }

    if (ignoreDuplicates) {
        // Remove duplicate characters
        input = [...new Set(input.split(''))].join('');
    }

    let length = input.length;
    if (lengthInput) {
        length = parseInt(lengthInput, 10);
        if (length < 1 || length > input.length) {
            document.getElementById('outputSection').innerHTML = `<p>Please enter a valid length (1-${input.length}).</p>`;
            return;
        }
    }

    const perms = generatePermutations(input, length);
    perms.sort();

    // Generate the permutations table
    const tableHtml = `
        <table>
            <thead>
                <tr><th>#</th><th>Permutation</th></tr>
            </thead>
            <tbody>
                ${perms.map((perm, idx) => `<tr><td>${idx + 1}</td><td>${perm}</td></tr>`).join('')}
            </tbody>
        </table>
    `;

    // Count occurrences of permutations
    const occurrences = countOccurrences(perms);

    // Generate the occurrences table with numbering
    const occurrencesTableHtml = `
        <table>
            <thead>
                <tr><th>#</th><th>Permutation</th><th>Occurrences</th></tr>
            </thead>
            <tbody>
                ${Object.entries(occurrences)
                    .map(([perm, count], idx) => `<tr><td>${idx + 1}</td><td>${perm}</td><td>${count}</td></tr>`)
                    .join('')}
            </tbody>
        </table>
    `;

    const resultHtml = `
        <h2 id="permutationsTable">Permutations of "${input}" (Length: ${length})</h2>
        <p>Total: ${perms.length} permutations</p>
        <a href="#occurrencesTable" class="nav-link">&#128279; Occurrences Table</a>
        ${tableHtml}
        <h2 id="occurrencesTable">Occurrences of Permutations</h2>
        <p>Total Unique Permutations: ${Object.keys(occurrences).length}</p>
        <a href="#permutationsTable" class="nav-link">&#128279; Permutations Table</a>
        ${occurrencesTableHtml}
    `;
    document.getElementById('outputSection').innerHTML = resultHtml;
    document.getElementById('outputSection').style.display = 'block';

    // Enable floating buttons
    document.getElementById('copyBtn').disabled = false;
    document.getElementById('downloadBtn').disabled = false;
});

// Handle the toggle button for ignoring duplicate characters
document.getElementById('toggleDuplicatesBtn').addEventListener('click', () => {
    const toggleBtn = document.getElementById('toggleDuplicatesBtn');
    toggleBtn.classList.toggle('enabled');
    toggleBtn.innerText = toggleBtn.classList.contains('enabled')
        ? 'Ignore Duplicate Characters: On'
        : 'Ignore Duplicate Characters: Off';
});

// Handle the toggle button for removing duplicate words
document.getElementById('toggleDuplicateWordsBtn').addEventListener('click', () => {
    const toggleBtn = document.getElementById('toggleDuplicateWordsBtn');
    toggleBtn.classList.toggle('enabled');
    toggleBtn.innerText = toggleBtn.classList.contains('enabled')
        ? 'Remove Duplicate Words: On'
        : 'Remove Duplicate Words: Off';
});

// Handle the copy button click
document.getElementById('copyBtn').addEventListener('click', () => {
    const outputSection = document.getElementById('outputSection');
    if (outputSection.style.display !== 'none') {
        const permutationsText = document.querySelectorAll('#outputSection td:nth-child(2)');
        const permutations = Array.from(permutationsText)
            .map((td) => td.innerText)
            .join(', ');
        navigator.clipboard
            .writeText(permutations)
            .then(() => alert('Permutations copied to clipboard!'))
            .catch((err) => alert('Failed to copy text: ' + err));
    }
});

// Handle the download button click
document.getElementById('downloadBtn').addEventListener('click', () => {
    const outputSection = document.getElementById('outputSection');
    if (outputSection.style.display !== 'none') {
        // Hide floating buttons before taking the screenshot
        document.getElementById('copyBtn').style.display = 'none';
        document.getElementById('downloadBtn').style.display = 'none';

        // Capture the output section as an image
        html2canvas(outputSection).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = 'permutations.png';
            link.click();

            // Show the buttons again after the download
            document.getElementById('copyBtn').style.display = 'block';
            document.getElementById('downloadBtn').style.display = 'block';
        });
    }
});

// Handle the clear button click
document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('inputText').value = '';
    document.getElementById('lengthInfo').innerText = `Current Length: 0`;
    document.getElementById('permutationLength').value = '';
    document.getElementById('outputSection').innerHTML = '';
    document.getElementById('outputSection').style.display = 'none'; // Hide output section

    // Disable the copy and download buttons
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
});

// Display the current length of the input text
$('#inputText').on('input', function() {
    const inputLength = $(this).val()   .length;
    $('#lengthInfo').text(`Current Length: ${inputLength}`);
});
