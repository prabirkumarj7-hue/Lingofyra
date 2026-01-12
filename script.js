// LINGOFYRA AI - CORE LOGIC
const transCache = new Map(); // Global Cache for performance

document.addEventListener('DOMContentLoaded', () => {

    // --- NAVIGATION DROPDOWN ---
    const dropdown = document.querySelector('.dropdown');
    const dropdownBtn = document.getElementById('nav-dropdown-btn');

    if (dropdownBtn) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        window.addEventListener('click', () => {
            if (dropdown && dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
            }
        });
    }

    // --- LOGIN STATUS CHECK ---
    const checkLoginStatus = () => {
        const user = localStorage.getItem('lingofyra_user');
        const loginBtn = document.getElementById('login-nav-btn');
        const dbLink = document.getElementById('db-explorer-item');

        // Show DB Link only for Admin
        if (user === 'Admin' && dbLink) {
            dbLink.style.display = 'block';
        }

        if (user && loginBtn) {
            const userContainer = document.createElement('div');
            userContainer.style.display = 'flex';
            userContainer.style.alignItems = 'center';
            userContainer.style.gap = '10px';

            userContainer.innerHTML = `
                <div class="user-profile-nav" style="cursor: default;">
                    <span class="material-icons-round" style="font-size: 1.2rem; color: #6366f1;">account_circle</span>
                    <span>${user}</span>
                </div>
                <button onclick="handleLogout()" class="btn-login-nav" style="background: rgba(239, 68, 68, 0.1) !important; color: #ef4444 !important; border-color: rgba(239, 68, 68, 0.3) !important; display: flex; align-items: center; gap: 5px; padding: 8px 15px;">
                    <span>Logout</span>
                    <span class="material-icons-round" style="font-size: 1rem;">logout</span>
                </button>
            `;

            loginBtn.replaceWith(userContainer);
        }
    };

    window.handleLogout = () => {
        if (confirm("Are you sure you want to logout?")) {
            localStorage.removeItem('lingofyra_user');
            location.reload();
        }
    };

    checkLoginStatus();

    // --- FEEDBACK LOGIC ---
    let currentRating = 0;

    window.toggleFeedback = () => {
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.classList.toggle('active');
        }
    };

    window.setRating = (rating) => {
        currentRating = rating;
        const btns = document.querySelectorAll('.rating-btn');
        btns.forEach((btn, index) => {
            if (index < rating) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    window.submitFeedback = () => {
        const text = document.getElementById('feedback-text').value;
        if (currentRating === 0 && !text) {
            alert("Please provide a rating or feedback!");
            return;
        }

        const user = localStorage.getItem('lingofyra_user') || 'Anonymous';

        // Save to Database
        if (window.LingofyraDB) {
            LingofyraDB.feedback.add({
                user: user,
                rating: currentRating,
                message: text
            });
        }

        alert("Thank you for your feedback! It helps us improve Lingofyra.");

        // Reset and Close
        document.getElementById('feedback-text').value = '';
        currentRating = 0;
        document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
        window.toggleFeedback();
    };

    // --- DICTIONARY LOGIC ---
    const dictInput = document.getElementById('dict-input');
    const dictSearchBtn = document.getElementById('dict-search-btn');
    const dictResult = document.getElementById('dict-result');
    const resWord = document.getElementById('res-word');
    const resPhonetic = document.getElementById('res-phonetic');
    const resSynonyms = document.getElementById('res-synonyms');
    const resContent = document.querySelector('.res-content');

    const dictLangSelect = document.getElementById('dict-lang-select');

    async function searchDictionary(word) {
        if (!word) return;
        dictSearchBtn.textContent = 'Searching...';
        const targetLang = dictLangSelect.value;
        const targetLangName = dictLangSelect.options[dictLangSelect.selectedIndex].text;

        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            const data = await response.json();

            if (!response.ok) throw new Error('Word not found');

            const entry = data[0];
            const primaryDef = entry.meanings[0].definitions[0].definition;

            // Populate Results
            resWord.textContent = entry.word;
            resPhonetic.textContent = entry.phonetic || entry.phonetics[0]?.text || '';

            // --- BILINGUAL ENHANCEMENTS (Dynamic Language Parallel) ---
            async function getDictTrans(text) {
                if (targetLang === 'en' || !text) return text;
                const cacheKey = `${targetLang}:${text}`;
                if (transCache.has(cacheKey)) return transCache.get(cacheKey);
                try {
                    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
                    const json = await res.json();
                    const result = json[0].map(p => p[0]).join('');
                    transCache.set(cacheKey, result);
                    return result;
                } catch (e) { return text; }
            }

            try {
                let foundExample = entry.meanings.flatMap(m => m.definitions).find(d => d.example)?.example;

                const [wordTrans, defTrans, exTrans] = await Promise.all([
                    getDictTrans(entry.word),
                    getDictTrans(primaryDef),
                    foundExample ? getDictTrans(foundExample) : Promise.resolve('')
                ]);

                // Update UI
                document.getElementById('res-short-meaning').textContent = wordTrans;
                document.getElementById('res-trans-label').textContent = `${targetLangName} Meaning`;
                document.getElementById('res-trans-meaning').textContent = defTrans;
                document.getElementById('dict-trans-section').classList.remove('hidden');

                if (foundExample) {
                    document.getElementById('res-eng-example').textContent = `"${foundExample}"`;
                    document.getElementById('res-trans-example').textContent = exTrans;
                    document.getElementById('dict-example-section').classList.remove('hidden');
                } else {
                    document.getElementById('dict-example-section').classList.add('hidden');
                }
            } catch (e) {
                console.log("Translations failed", e);
                document.getElementById('dict-trans-section').classList.add('hidden');
            }

            // English Meanings
            const resContentInside = document.getElementById('english-definition-content');
            resContentInside.innerHTML = entry.meanings.map(m => `
                <div class="res-section">
                    <span class="part-of-speech">${m.partOfSpeech}</span>
                    <p class="definition">${m.definitions[0].definition}</p>
                    ${m.definitions[0].example ? `<p class="example">"${m.definitions[0].example}"</p>` : ''}
                </div>
            `).join('');

            // Synonyms
            const allSynonyms = entry.meanings.flatMap(m => m.synonyms).slice(0, 5);
            if (allSynonyms.length > 0) {
                resSynonyms.innerHTML = allSynonyms.map(s => `<span class="tag">${s}</span>`).join('');
                document.querySelector('.synonyms-box').classList.remove('hidden');
            } else {
                document.querySelector('.synonyms-box').classList.add('hidden');
            }

            dictResult.classList.remove('hidden');
            dictResult.scrollIntoView({ behavior: 'smooth', block: 'center' });

        } catch (error) {
            alert("Word not found! Please try another word.");
            dictResult.classList.add('hidden');
        } finally {
            dictSearchBtn.textContent = 'Search';
        }
    }

    if (dictSearchBtn) {
        dictSearchBtn.onclick = () => searchDictionary(dictInput.value);
    }
    if (dictInput) {
        dictInput.onkeypress = (e) => { if (e.key === 'Enter') searchDictionary(dictInput.value); };
    }


    // --- TRANSLATOR LOGIC ---
    const translateBtn = document.getElementById('translate-btn');
    const inputText = document.getElementById('input-text');
    const outputText = document.getElementById('output-text');
    const fromLang = document.getElementById('from-lang');
    const toLang = document.getElementById('to-lang');
    const swapBtn = document.getElementById('swap-langs');
    const copyBtn = document.getElementById('copy-trans');

    if (translateBtn) {
        translateBtn.onclick = async () => {
            const text = inputText.value.trim();
            if (!text) return;

            translateBtn.textContent = 'Translating...';
            translateBtn.disabled = true;

            const cacheKey = `${fromLang.value}:${toLang.value}:${text}`;
            if (transCache.has(cacheKey)) {
                outputText.value = transCache.get(cacheKey);
                translateBtn.textContent = 'Translate';
                translateBtn.disabled = false;
                return;
            }

            try {
                const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang.value}&tl=${toLang.value}&dt=t&q=${encodeURIComponent(text)}`;
                const res = await fetch(apiUrl);
                const data = await res.json();

                if (data && data[0]) {
                    let resultText = data[0].map(part => part[0]).join('');
                    outputText.value = resultText;
                    transCache.set(cacheKey, resultText);
                } else {
                    outputText.value = "Translation error.";
                }
            } catch (error) {
                outputText.value = "Network Error.";
            } finally {
                translateBtn.textContent = 'Translate Now';
                translateBtn.disabled = false;
            }
        };
    }

    if (swapBtn) {
        swapBtn.onclick = () => {
            [fromLang.value, toLang.value] = [toLang.value, fromLang.value];
            [inputText.value, outputText.value] = [outputText.value, inputText.value];
        };
    }

    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(outputText.value);
            alert("Copied to clipboard!");
        };
    }


    // --- VOICE LOGIC ---
    const voiceSelect = document.getElementById('voice-select');
    let voices = [];

    function populateVoices() {
        if (!voiceSelect) return;
        voices = window.speechSynthesis.getVoices();
        voiceSelect.innerHTML = voices
            .filter(v => v.lang.includes('en')) // Filter English for standard use
            .map((v, i) => `<option value="${i}">${v.name}</option>`)
            .join('');
    }

    if (voiceSelect) {
        populateVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoices;
        }
    }

    window.speakText = (text) => {
        if (!text) return;
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);

        const voicePool = voices.filter(v => v.lang.includes('en'));
        const selectedVoiceIndex = voiceSelect ? voiceSelect.value : 0;
        const selectedVoice = voicePool[selectedVoiceIndex];

        if (selectedVoice) msg.voice = selectedVoice;
        window.speechSynthesis.speak(msg);
    };

    window.speakTranslation = () => {
        const msg = new SpeechSynthesisUtterance(outputText.value);
        msg.lang = toLang.value;
        window.speechSynthesis.speak(msg);
    };


    // --- TENSE MASTER BOOK (EXPANDED) ---
    const tenseContent = document.getElementById('tense-content');
    const tenseTabs = document.querySelectorAll('.tense-tab');

    const tenseData = {
        present: {
            mainTitle: "Present Tense (वर्तमान काल)",
            subTypes: [
                {
                    name: "Present Simple",
                    rule: "Subject + V1 (s/es)",
                    desc: "For habits and general truths.",
                    examples: [
                        { eng: "He drinks milk daily.", hin: "वह रोज़ दूध पीता है।" },
                        { eng: "The sun sets in the west.", hin: "सूरज पश्चिम में डूबता है।" }
                    ]
                },
                {
                    name: "Present Progressive (Continuous)",
                    rule: "Subject + is/am/are + V1 + ing",
                    desc: "Action happening right now.",
                    examples: [
                        { eng: "I am reading a book.", hin: "मैं एक किताब पढ़ रहा हूँ।" },
                        { eng: "They are playing cricket.", hin: "वे क्रिकेट खेल रहे हैं।" }
                    ]
                },
                {
                    name: "Present Perfect",
                    rule: "Subject + has/have + V3",
                    desc: "Action just completed or impact remains.",
                    examples: [
                        { eng: "She has finished her work.", hin: "उसने अपना काम खत्म कर लिया है।" },
                        { eng: "I have seen this movie.", hin: "मैंने यह फिल्म देख ली है।" }
                    ]
                },
                {
                    name: "Present Perfect Progressive",
                    rule: "Subject + has/have + been + V1 + ing",
                    desc: "Action started in past and still continuing.",
                    examples: [
                        { eng: "It has been raining since morning.", hin: "सुबह से बारिश हो रही है।" },
                        { eng: "I have been living here for 5 years.", hin: "मैं यहाँ 5 सालों से रह रहा हूँ।" }
                    ]
                }
            ]
        },
        past: {
            mainTitle: "Past Tense (भूतकाल)",
            subTypes: [
                {
                    name: "Past Simple",
                    rule: "Subject + V2",
                    desc: "Action completed in the past.",
                    examples: [
                        { eng: "I watched a movie yesterday.", hin: "मैंने कल एक फिल्म देखी।" },
                        { eng: "He went to school.", hin: "वह स्कूल गया।" }
                    ]
                },
                {
                    name: "Past Progressive (Continuous)",
                    rule: "Subject + was/were + V1 + ing",
                    desc: "Action was continuing in the past.",
                    examples: [
                        { eng: "I was sleeping when you called.", hin: "जब तुमने फोन किया, मैं सो रहा था।" },
                        { eng: "They were dancing.", hin: "वे नाच रहे थे।" }
                    ]
                },
                {
                    name: "Past Perfect",
                    rule: "Subject + had + V3",
                    desc: "Action completed before another past action.",
                    examples: [
                        { eng: "The train had left before I reached.", hin: "मेरे पहुँचने से पहले ट्रेन जा चुकी थी।" },
                        { eng: "He had already eaten.", hin: "वह पहले ही खा चुका था।" }
                    ]
                },
                {
                    name: "Past Perfect Progressive",
                    rule: "Subject + had + been + V1 + ing",
                    desc: "Action started and continued up to a point in past.",
                    examples: [
                        { eng: "He had been working since 2 PM.", hin: "वह दोपहर 2 बजे से काम कर रहा था।" },
                        { eng: "They had been playing for hours.", hin: "वे घंटों से खेल रहे थे।" }
                    ]
                }
            ]
        },
        future: {
            mainTitle: "Future Tense (भविष्य काल)",
            subTypes: [
                {
                    name: "Future Simple",
                    rule: "Subject + will + V1",
                    desc: "Action that will happen later.",
                    examples: [
                        { eng: "I will go to market tomorrow.", hin: "मैं कल बाज़ार जाऊँगा।" },
                        { eng: "She will help you.", hin: "वह तुम्हारी मदद करेगी।" }
                    ]
                },
                {
                    name: "Future Progressive (Continuous)",
                    rule: "Subject + will be + V1 + ing",
                    desc: "Action continuing at a point in future.",
                    examples: [
                        { eng: "I will be waiting for you.", hin: "मैं तुम्हारा इंतज़ार कर रहा हूँगा।" },
                        { eng: "They will be flying to USA.", hin: "वे अमेरिका जा रहे होंगे।" }
                    ]
                },
                {
                    name: "Future Perfect",
                    rule: "Subject + will have + V3",
                    desc: "Action that will be completed by a future time.",
                    examples: [
                        { eng: "I will have finished my degree by 2027.", hin: "मैं 2027 तक अपनी डिग्री पूरी कर चुका हूँगा।" },
                        { eng: "She will have reached home.", hin: "वह घर पहुँच चुकी होगी।" }
                    ]
                },
                {
                    name: "Future Perfect Progressive",
                    rule: "Subject + will have been + V1 + ing",
                    desc: "Action continuing up to a point in future.",
                    examples: [
                        { eng: "I will have been working here for a month.", hin: "मुझे यहाँ काम करते हुए एक महीना हो चुका होगा।" },
                        { eng: "She will have been teaching for 10 years.", hin: "वह 10 सालों से पढ़ा रही होगी।" }
                    ]
                }
            ]
        },
        verbs: {
            mainTitle: "Verb Forms (V1, V2, V3)",
            isTable: true,
            columns: ["V1 (Base)", "V2 (Past)", "V3 (Participle)", "Meaning (Hindi)"],
            list: [
                { v1: "Go", v2: "Went", v3: "Gone", hin: "जाना" },
                { v1: "Eat", v2: "Ate", v3: "Eaten", hin: "खाना" },
                { v1: "Sleep", v2: "Slept", v3: "Slept", hin: "सोना" },
                { v1: "Write", v2: "Wrote", v3: "Written", hin: "लिखना" },
                { v1: "Read", v2: "Read", v3: "Read", hin: "पढ़ना" },
                { v1: "See", v2: "Saw", v3: "Seen", hin: "देखना" },
                { v1: "Do", v2: "Did", v3: "Done", hin: "करना" },
                { v1: "Speak", v2: "Spoke", v3: "Spoken", hin: "बोलना" },
                { v1: "Take", v2: "Took", v3: "Taken", hin: "लेना" },
                { v1: "Give", v2: "Gave", v3: "Given", hin: "देना" },
                { v1: "Come", v2: "Came", v3: "Come", hin: "आना" },
                { v1: "Run", v2: "Ran", v3: "Run", hin: "दौड़ना" },
                { v1: "Walk", v2: "Walked", v3: "Walked", hin: "चलना" },
                { v1: "Drink", v2: "Drank", v3: "Drunk", hin: "पीना" },
                { v1: "Think", v2: "Thought", v3: "Thought", hin: "सोचना" },
                { v1: "Know", v2: "Knew", v3: "Known", hin: "जानना" },
                { v1: "Make", v2: "Made", v3: "Made", hin: "बनाना" },
                { v1: "Keep", v2: "Kept", v3: "Kept", hin: "रखना" },
                { v1: "Feel", v2: "Felt", v3: "Felt", hin: "महसूस करना" },
                { v1: "Become", v2: "Became", v3: "Become", hin: "बनना" },
                { v1: "Leave", v2: "Left", v3: "Left", hin: "छोड़ना" },
                { v1: "Bring", v2: "Brought", v3: "Brought", hin: "लाना" },
                { v1: "Buy", v2: "Bought", v3: "Bought", hin: "खरीदना" },
                { v1: "Catch", v2: "Caught", v3: "Caught", hin: "पकड़ना" },
                { v1: "Choose", v2: "Chose", v3: "Chosen", hin: "चुनना" },
                { v1: "Dream", v2: "Dreamt", v3: "Dreamt", hin: "सपना देखना" },
                { v1: "Drive", v2: "Drove", v3: "Driven", hin: "चलाना" },
                { v1: "Fall", v2: "Fell", v3: "Fallen", hin: "गिरना" },
                { v1: "Fight", v2: "Fought", v3: "Fought", hin: "लड़ना" },
                { v1: "Find", v2: "Found", v3: "Found", hin: "पाना" },
                { v1: "Fly", v2: "Flew", v3: "Flown", hin: "उड़ना" },
                { v1: "Forget", v2: "Forgot", v3: "Forgotten", hin: "भूलना" },
                { v1: "Get", v2: "Got", v3: "Got", hin: "पाना" },
                { v1: "Grow", v2: "Grew", v3: "Grown", hin: "बढ़ना" },
                { v1: "Hear", v2: "Heard", v3: "Heard", hin: "सुनना" },
                { v1: "Hide", v2: "Hid", v3: "Hidden", hin: "छिपना" },
                { v1: "Hold", v2: "Held", v3: "Held", hin: "पकड़ना" },
                { v1: "Learn", v2: "Learnt", v3: "Learnt", hin: "सीखना" },
                { v1: "Lose", v2: "Lost", v3: "Lost", hin: "खोना" },
                { v1: "Meet", v2: "Met", v3: "Met", hin: "मिलना" },
                { v1: "Pay", v2: "Paid", v3: "Paid", hin: "भुगतान" },
                { v1: "Put", v2: "Put", v3: "Put", hin: "रखना" },
                { v1: "Say", v2: "Said", v3: "Said", hin: "कहना" },
                { v1: "Sell", v2: "Sold", v3: "Sold", hin: "बेचना" },
                { v1: "Send", v2: "Sent", v3: "Sent", hin: "भेजना" },
                { v1: "Sing", v2: "Sang", v3: "Sung", hin: "गाना" },
                { v1: "Sit", v2: "Sat", v3: "Sat", hin: "बैठना" },
                { v1: "Stand", v2: "Stood", v3: "Stood", hin: "खड़ा होना" },
                { v1: "Swim", v2: "Swam", v3: "Swum", hin: "तैरना" },
                { v1: "Teach", v2: "Taught", v3: "Taught", hin: "पढ़ाना" },
                { v1: "Tell", v2: "Told", v3: "Told", hin: "बताना" },
                { v1: "Understand", v2: "Understood", v3: "Understood", hin: "समझना" },
                { v1: "Wake", v2: "Woke", v3: "Woken", hin: "जागना" },
                { v1: "Win", v2: "Won", v3: "Won", hin: "जीतना" },
                { v1: "Work", v2: "Worked", v3: "Worked", hin: "काम" },
                { v1: "Play", v2: "Played", v3: "Played", hin: "खेलना" },
                { v1: "Call", v2: "Called", v3: "Called", hin: "पुकारना" },
                { v1: "Help", v2: "Helped", v3: "Helped", hin: "मदद" },
                { v1: "Ask", v2: "Asked", v3: "Asked", hin: "पूछना" },
                { v1: "Use", v2: "Used", v3: "Used", hin: "उपयोग" },
                { v1: "Need", v2: "Needed", v3: "Needed", hin: "ज़रूरत" },
                { v1: "Mean", v2: "Meant", v3: "Meant", hin: "मतलब" },
                { v1: "Let", v2: "Let", v3: "Let", hin: "देना" },
                { v1: "Begin", v2: "Began", v3: "Begun", hin: "शुरू" },
                { v1: "Seem", v2: "Seemed", v3: "Seemed", hin: "लगना" },
                { v1: "Talk", v2: "Talked", v3: "Talked", hin: "बात" },
                { v1: "Turn", v2: "Turned", v3: "Turned", hin: "मुड़ना" },
                { v1: "Start", v2: "Started", v3: "Started", hin: "शुरू" },
                { v1: "Show", v2: "Showed", v3: "Shown", hin: "दिखाना" },
                { v1: "Move", v2: "Moved", v3: "Moved", hin: "हिलना" },
                { v1: "Live", v2: "Lived", v3: "Lived", hin: "जीना" },
                { v1: "Believe", v2: "Believed", v3: "Believed", hin: "मानना" },
                { v1: "Happen", v2: "Happened", v3: "Happened", hin: "होना" },
                { v1: "Include", v2: "Included", v3: "Included", hin: "शामिल" },
                { v1: "Continue", v2: "Continued", v3: "Continued", hin: "जारी" },
                { v1: "Set", v2: "Set", v3: "Set", hin: "लगाना" },
                { v1: "Change", v2: "Changed", v3: "Changed", hin: "बदलना" },
                { v1: "Lead", v2: "Led", v3: "Led", hin: "नेतृत्व" },
                { v1: "Stay", v2: "Stayed", v3: "Stayed", hin: "रुकना" },
                { v1: "Follow", v2: "Followed", v3: "Followed", hin: "पीछा" },
                { v1: "Stop", v2: "Stopped", v3: "Stopped", hin: "रुकना" },
                { v1: "Create", v2: "Created", v3: "Created", hin: "बनाना" },
                { v1: "Allow", v2: "Allowed", v3: "Allowed", hin: "अनुमति" },
                { v1: "Add", v2: "Added", v3: "Added", hin: "जोड़ना" },
                { v1: "Spend", v2: "Spent", v3: "Spent", hin: "खर्च" },
                { v1: "Grow", v2: "Grew", v3: "Grown", hin: "बढ़ना" },
                { v1: "Open", v2: "Opened", v3: "Opened", hin: "खोलना" },
                { v1: "Walk", v2: "Walked", v3: "Walked", hin: "टहलना" },
                { v1: "Win", v2: "Won", v3: "Won", hin: "जीतना" },
                { v1: "Offer", v2: "Offered", v3: "Offered", hin: "प्रस्ताव" },
                { v1: "Remember", v2: "Remembered", v3: "Remembered", hin: "याद" },
                { v1: "Love", v2: "Loved", v3: "Loved", hin: "प्यार" },
                { v1: "Consider", v2: "Considered", v3: "Considered", hin: "विचार" },
                { v1: "Appear", v2: "Appeared", v3: "Appeared", hin: "प्रकट" },
                { v1: "Buy", v2: "Bought", v3: "Bought", hin: "खरीदना" },
                { v1: "Wait", v2: "Waited", v3: "Waited", hin: "इंतज़ार" },
                { v1: "Serve", v2: "Served", v3: "Served", hin: "सेवा" },
                { v1: "Die", v2: "Died", v3: "Died", hin: "मरना" },
                { v1: "Send", v2: "Sent", v3: "Sent", hin: "भेजना" },
                { v1: "Expect", v2: "Expected", v3: "Expected", hin: "आशा" },
                { v1: "Build", v2: "Built", v3: "Built", hin: "निर्माण" },
                { v1: "Stay", v2: "Stayed", v3: "Stayed", hin: "ठहरना" },
                { v1: "Fall", v2: "Fell", v3: "Fallen", hin: "गिरना" },
                { v1: "Cut", v2: "Cut", v3: "Cut", hin: "काटना" },
                { v1: "Reach", v2: "Reached", v3: "Reached", hin: "पहुँचना" },
                { v1: "Kill", v2: "Killed", v3: "Killed", hin: "मारना" },
                { v1: "Remain", v2: "Remained", v3: "Remained", hin: "बचना" }
            ]
        }
    };

    let verbLimit = 10;
    let currentTense = 'past';

    window.loadTense = async (tense) => {
        currentTense = tense;
        const data = tenseData[tense];
        if (!data || !tenseContent) return;

        // Reset limit if switching categories
        if (tense !== 'verbs') verbLimit = 10;

        const langSelect = document.getElementById('tense-lang-select');
        const targetLang = langSelect ? langSelect.value : 'hi';
        const targetLangName = langSelect ? langSelect.options[langSelect.selectedIndex].text : 'Hindi';

        // Update Tabs
        tenseTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.toLowerCase().includes(tense)) tab.classList.add('active');
        });

        // Show Loading State
        tenseContent.innerHTML = `<div class="tense-loading" style="text-align:center; padding: 50px; color: var(--text-muted);">
            <span class="material-icons-round" style="animation: spin 1s linear infinite; font-size: 3rem;">sync</span>
            <p>Processing ${targetLangName} View...</p>
        </div>`;

        // Efficient Translation with Caching
        async function getRawTranslation(text) {
            if (targetLang === 'en' || !text) return text;
            const cacheKey = `${targetLang}:${text}`;
            if (transCache.has(cacheKey)) return transCache.get(cacheKey);

            try {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
                const json = await res.json();
                const result = json[0].map(p => p[0]).join('');
                transCache.set(cacheKey, result);
                return result;
            } catch (e) { return text; }
        }

        // Parallelize all initial translations
        let rawTitle = data.mainTitle;
        if (rawTitle.includes('(')) rawTitle = rawTitle.split('(')[0];

        if (data.isTable) {
            const [translatedMainTitle, ...translatedCols] = await Promise.all([
                getRawTranslation(rawTitle),
                ...data.columns.map(col => (targetLang === 'hi' || targetLang === 'en') ? Promise.resolve(col) : getRawTranslation(col))
            ]);

            const visibleVerbs = data.list.slice(0, verbLimit);
            const translatedMeanings = await Promise.all(visibleVerbs.map(v => (targetLang === 'hi' || targetLang === 'en') ? Promise.resolve(v.hin) : getRawTranslation(v.hin)));

            let rowsHtml = visibleVerbs.map((verb, idx) => `
                <tr>
                    <td><strong>${verb.v1}</strong></td>
                    <td>${verb.v2}</td>
                    <td>${verb.v3}</td>
                    <td style="color: var(--primary-light);">${translatedMeanings[idx]}</td>
                    <td>
                        <button class="btn-icon" onclick="speakText('${verb.v1}, ${verb.v2}, ${verb.v3}')">
                            <span class="material-icons-round" style="font-size: 1.2rem;">volume_up</span>
                        </button>
                    </td>
                </tr>
            `).join('');

            tenseContent.innerHTML = `
                <h2 style="margin-bottom: 25px; text-align: center; color: var(--primary-light);">${translatedMainTitle}</h2>
                <div class="table-responsive card" style="background: rgba(0,0,0,0.2); padding: 0; overflow-x: auto; border: 1px solid rgba(255,255,255,0.05);">
                    <table class="verb-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead style="background: rgba(255,121,198,0.1); color: #ff79c6;">
                            <tr>
                                ${translatedCols.map(c => `<th style="padding: 15px; border-bottom: 2px solid rgba(255,121,198,0.2);">${c}</th>`).join('')}
                                <th style="padding: 15px; border-bottom: 2px solid rgba(255,121,198,0.2);">Play</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
                ${verbLimit < data.list.length ? `
                    <div style="text-align: center; margin-top: 30px;">
                        <button class="btn-secondary" onclick="loadMoreVerbs()">Load More Words (+20)</button>
                    </div>
                ` : ''}
            `;
            return;
        }

        // Tense Pages Parallel Translation
        const translatedMainTitle = await getRawTranslation(rawTitle);
        let subTypesHtml = '';

        for (const sub of data.subTypes) {
            const [tName, tDesc, tRule] = await Promise.all([
                getRawTranslation(sub.name),
                getRawTranslation(sub.desc),
                getRawTranslation(sub.rule)
            ]);

            const tExamples = await Promise.all(sub.examples.map(ex =>
                targetLang === 'en' ? Promise.resolve('') : (targetLang === 'hi' ? Promise.resolve(ex.hin) : getRawTranslation(ex.eng))
            ));

            const examplesHtml = sub.examples.map((ex, idx) => `
                <div class="example-card">
                    <div class="example-text">
                        <span class="eng">${ex.eng}</span>
                        ${tExamples[idx] ? `<span class="hin" style="color: var(--primary-light);">${tExamples[idx]}</span>` : ''}
                    </div>
                    <button class="btn-icon" onclick="speakText('${ex.eng}. ${tExamples[idx]}')">
                        <span class="material-icons-round">volume_up</span>
                    </button>
                </div>
            `).join('');

            subTypesHtml += `
                <div class="tense-rule-box" style="margin-top: 30px;">
                    <div>
                        <h3 style="color: #ff79c6; margin-bottom: 5px;">${tName}</h3>
                        <p style="font-weight: 700; color: #fff;">Rule: ${tRule}</p>
                        <p style="font-size: 0.9rem; color: var(--text-muted);">${tDesc}</p>
                    </div>
                </div>
                <div class="tense-grid">${examplesHtml}</div>
            `;
        }


        tenseContent.innerHTML = `
            <h2 style="margin-bottom: 25px; text-align: center; color: var(--primary-light);">${translatedMainTitle}</h2>
            ${subTypesHtml}
        `;
    };

    window.loadMoreVerbs = () => {
        verbLimit += 20;
        loadTense('verbs');
    };

    window.filterTenseContent = (query) => {
        const q = query.toLowerCase().trim();
        const content = document.getElementById('tense-content');
        if (!content) return;

        // If in Verb Table mode
        const table = content.querySelector('.verb-table');
        if (table) {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(q) ? '' : 'none';
            });
            return;
        }

        // If in Tense mode
        const boxes = content.querySelectorAll('.tense-rule-box, .tense-grid');
        let currentRuleVisible = true;

        // We iterate and hide blocks. This is a bit tricky because rules and grids are separate.
        // Let's hide example cards and rule boxes
        const subTenseBlocks = content.querySelectorAll('.tense-rule-box');
        const exampleGrids = content.querySelectorAll('.tense-grid');

        subTenseBlocks.forEach((box, index) => {
            const grid = exampleGrids[index];
            const boxText = box.textContent.toLowerCase();
            const gridText = grid.textContent.toLowerCase();

            const hasMatch = boxText.includes(q) || gridText.includes(q);

            box.style.display = hasMatch ? '' : 'none';
            grid.style.display = hasMatch ? '' : 'none';

            // Also filter individual example cards within the grid if grid is visible
            if (hasMatch) {
                const cards = grid.querySelectorAll('.example-card');
                cards.forEach(card => {
                    const cardText = card.textContent.toLowerCase();
                    card.style.display = cardText.includes(q) ? '' : 'none';
                });
            }
        });
    };

    // --- PDF EXPORT LOGIC ---
    window.downloadTensePDF = async () => {
        if (typeof html2pdf === 'undefined') {
            alert("PDF library is still loading. Please wait 2 seconds and try again.");
            return;
        }

        const langSelect = document.getElementById('tense-lang-select');
        const targetLang = langSelect ? langSelect.value : 'hi';
        const targetLangName = langSelect ? langSelect.options[langSelect.selectedIndex].text : 'Hindi';

        alert(`Generating Your Tense Master Book in ${targetLangName}... This may take a moment.`);

        const element = document.createElement('div');
        element.style.width = '210mm'; // Fixed A4 width
        element.style.background = 'white';
        element.style.color = '#1e293b';
        element.style.fontFamily = "'Outfit', sans-serif";

        // Efficient Parallel Translation with Caching
        async function getRawTranslation(text) {
            if (targetLang === 'en' || !text) return text;
            const cacheKey = `${targetLang}:${text}`;
            if (transCache.has(cacheKey)) return transCache.get(cacheKey);

            try {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
                const json = await res.json();
                const result = json[0].map(p => p[0]).join('');
                transCache.set(cacheKey, result);
                return result;
            } catch (e) { return text; }
        }

        const [tSubHeader, tEditionLabel] = await Promise.all([
            getRawTranslation("The Complete Sequential Guide to English Tenses"),
            getRawTranslation("Edition")
        ]);

        // Shared Style
        const pageStyle = `
            height: 297mm; 
            width: 210mm; 
            padding: 25mm; 
            box-sizing: border-box; 
            page-break-after: always; 
            position: relative;
            background: #fff;
            overflow: hidden;
        `;

        // Page 1: COVER PAGE
        let pdfHtml = `
            <div style="${pageStyle} display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 15px solid #6366f1;">
                <span style="font-size: 80px; margin-bottom: 20px;">📖</span>
                <h1 style="font-size: 55px; color: #6366f1; margin: 10px 0; font-family: 'Playfair Display', serif;">Lingofyra</h1>
                <h2 style="font-size: 30px; color: #1e293b; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 30px;">Tense Master Book</h2>
                <div style="width: 80px; height: 4px; background: #6366f1; margin: 0 auto 30px;"></div>
                <p style="font-size: 18px; color: #64748b; max-width: 80%;">${tSubHeader}</p>
                <div style="margin-top: 50px; padding: 12px 35px; background: #6366f1; color: white; border-radius: 50px; font-weight: bold; font-size: 20px;">
                    ${targetLangName} ${tEditionLabel}
                </div>
                <div style="position: absolute; bottom: 30mm; width: 100%; left: 0;">
                    <p style="color: #94a3b8; font-size: 14px;">© 2026 Lingofyra Learning Systems</p>
                    <p style="color: #6366f1; font-weight: bold; margin-top: 5px;">www.lingofyra.ai</p>
                </div>
            </div>
        `;

        // Prepare all Tense Data translations in parallel
        const tVerbTitle = await getRawTranslation("Essential Verb Forms (V1, V2, V3)");
        const tMainTitles = await Promise.all(order.map(k => getRawTranslation(tenseData[k].mainTitle.split('(')[0])));

        // Flatten all sub-types for parallel translation
        const allSubs = order.flatMap(k => tenseData[k].subTypes);
        const subTranslations = await Promise.all(allSubs.flatMap(s => [
            getRawTranslation(s.name),
            getRawTranslation(s.rule),
            getRawTranslation(s.desc),
            ...s.examples.slice(0, 2).map(ex => getRawTranslation(ex.eng))
        ]));

        let subIdx = 0;
        // Page 2, 3, 4: TENSE PAGES
        for (let i = 0; i < order.length; i++) {
            const data = tenseData[order[i]];
            const tMainTitle = tMainTitles[i];

            pdfHtml += `
                <div style="${pageStyle}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                        <h2 style="color: #6366f1; margin: 0; font-size: 24px;">${tMainTitle}</h2>
                        <span style="color: #94a3b8; font-size: 12px;">Lingofyra Mastery Guide</span>
                    </div>
            `;

            for (const sub of data.subTypes) {
                const tName = subTranslations[subIdx++];
                const tRule = subTranslations[subIdx++];
                const tDesc = subTranslations[subIdx++];

                pdfHtml += `
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #1e293b; margin: 0 0 8px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                            <span style="width: 10px; height: 10px; background: #6366f1; border-radius: 2px;"></span>
                            ${tName}
                        </h3>
                        <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                            <p style="font-weight: bold; margin: 0; color: #6366f1; font-size: 14px;">Rule: ${tRule}</p>
                            <p style="font-size: 12px; color: #64748b; margin: 5px 0 0 0;">${tDesc}</p>
                        </div>
                        <div style="padding-left: 25px;">
                `;

                for (const ex of sub.examples.slice(0, 2)) {
                    const tEx = subTranslations[subIdx++];
                    pdfHtml += `
                        <div style="margin-bottom: 10px; font-size: 13px;">
                            <div style="font-weight: 600; color: #334155;">• ${ex.eng}</div>
                            <div style="color: #6366f1; margin-top: 2px;">${tEx}</div>
                        </div>
                    `;
                }
                pdfHtml += `</div></div>`;
            }
            pdfHtml += `
                <div style="position: absolute; bottom: 15mm; left: 25mm; right: 25mm; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                    <span style="color: #cbd5e1; font-size: 10px;">Page ${i + 2} of 7</span>
                </div>
            </div>`;
        }

        for (let i = 0; i < 2; i++) {
            const pageVerbs = verbData.list.slice(i * verbsPerPage, (i + 1) * verbsPerPage);
            const mid = Math.ceil(pageVerbs.length / 2);
            const leftCol = pageVerbs.slice(0, mid);
            const rightCol = pageVerbs.slice(mid);

            pdfHtml += `
                <div style="${pageStyle}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                        <h2 style="color: #6366f1; margin: 0; font-size: 20px;">${tVerbTitle} - Part ${i + 1}</h2>
                    </div>
                    
                    <div style="display: flex; gap: 15mm;">
                        <!-- Left Column -->
                        <div style="flex: 1;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <tr style="background: #6366f1; color: white;">
                                    <th style="padding: 6px; text-align: left; border: 1px solid #6366f1;">V1</th>
                                    <th style="padding: 6px; text-align: left; border: 1px solid #6366f1;">V2</th>
                                    <th style="padding: 6px; text-align: left; border: 1px solid #6366f1;">V3</th>
                                </tr>
            `;

            for (const v of leftCol) {
                pdfHtml += `
                    <tr style="background: ${leftCol.indexOf(v) % 2 === 0 ? '#f8fafc' : '#ffffff'};">
                        <td style="padding: 5px; border: 1px solid #e2e8f0;"><strong>${v.v1}</strong></td>
                        <td style="padding: 5px; border: 1px solid #e2e8f0;">${v.v2}</td>
                        <td style="padding: 5px; border: 1px solid #e2e8f0;">${v.v3}</td>
                    </tr>`;
            }

            pdfHtml += `
                            </table>
                        </div>
                        <!-- Right Column -->
                        <div style="flex: 1;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <tr style="background: #6366f1; color: white;">
                                    <th style="padding: 6px; text-align: left; border: 1px solid #6366f1;">V1</th>
                                    <th style="padding: 6px; text-align: left; border: 1px solid #6366f1;">V2</th>
                                    <th style="padding: 6px; text-align: left; border: 1px solid #6366f1;">V3</th>
                                </tr>
            `;

            for (const v of rightCol) {
                pdfHtml += `
                    <tr style="background: ${rightCol.indexOf(v) % 2 === 0 ? '#f8fafc' : '#ffffff'};">
                        <td style="padding: 5px; border: 1px solid #e2e8f0;"><strong>${v.v1}</strong></td>
                        <td style="padding: 5px; border: 1px solid #e2e8f0;">${v.v2}</td>
                        <td style="padding: 5px; border: 1px solid #e2e8f0;">${v.v3}</td>
                    </tr>`;
            }

            pdfHtml += `
                            </table>
                        </div>
                    </div>
                    <div style="position: absolute; bottom: 15mm; left: 25mm; right: 25mm; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                        <span style="color: #cbd5e1; font-size: 10px;">Page ${i + 5} of 7</span>
                    </div>
                </div>`;
        }

        // Page 7: MASTERY TIPS
        const tTipsTitle = await getRawTranslation("Mastery Tips & Mistakes to Avoid");
        const tMistakesLabel = await getRawTranslation("Common Grammatical Errors");
        const tChecklistLabel = await getRawTranslation("Your Daily Practice Roadmap");

        const mistakes = [
            { w: "I am play cricket.", c: "I am playing cricket." },
            { w: "He go to school.", c: "He goes to school." },
            { w: "I have see him.", c: "I have seen him." }
        ];

        const checklist = [
            "Translate one new sentence every morning.",
            "Speak out loud to build muscle memory.",
            "Listen to English podcasts for 10 minutes.",
            "Use this Lingofyra guide for quick reference."
        ];

        pdfHtml += `
            <div style="${pageStyle} page-break-after: avoid; display: flex; flex-direction: column;">
                <h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-bottom: 40px; text-align: center;">${tTipsTitle}</h2>
                
                <div style="margin-bottom: 50px;">
                    <h3 style="color: #ef4444; margin-bottom: 20px; font-size: 20px;">🚫 ${tMistakesLabel}</h3>
                    <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 25px;">
        `;

        for (let m of mistakes) {
            pdfHtml += `
                <p style="margin-bottom: 15px; font-size: 16px;">
                    <span style="color: #ef4444; text-decoration: line-through;">${m.w}</span> ➔ 
                    <span style="color: #10b981; font-weight: bold;">${m.c}</span>
                </p>`;
        }

        pdfHtml += `
                    </div>
                </div>

                <div>
                    <h3 style="color: #6366f1; margin-bottom: 20px; font-size: 20px;">🚀 ${tChecklistLabel}</h3>
                    <div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 12px; padding: 25px;">
        `;

        for (let tip of checklist) {
            const tTip = await getRawTranslation(tip);
            pdfHtml += `
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="width: 10px; height: 10px; background: #6366f1; border-radius: 50%;"></div>
                    <span style="color: #1e293b; font-size: 15px;">${tTip}</span>
                </div>`;
        }

        pdfHtml += `
                    </div>
                </div>

                <div style="margin-top: auto; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 30px;">
                    <p style="font-style: italic; color: #64748b;">"Consistency is the bridges between goals and accomplishment."</p>
                    <p style="font-weight: bold; color: #6366f1; margin-top: 10px;">Lingofyra Mastery Edition</p>
                    <div style="margin-top: 20px; color: #cbd5e1; font-size: 10px;">Page 7 of 7</div>
                </div>
            </div>
        `;

        element.innerHTML = pdfHtml;

        const opt = {
            margin: 0,
            filename: `Lingofyra_Tense_Mastery_${targetLangName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).save();
    };

    // Initialize if on tense page
    if (document.getElementById('tense-content')) {
        loadTense('past');
    }

    // --- LESSON LOGIC ---
    const overlay = document.getElementById('lesson-overlay');
    const detailsContainer = document.getElementById('lesson-details');

    const categoryData = {
        alphabet: {
            title: "The Alphabet & Sounds",
            icon: "abc",
            steps: [
                { title: "Vowels (A, E, I, O, U)", desc: "The core of every word. Practice: 'App, Egg, Ink, Off, Up'." },
                { title: "Consonants (B to Z)", desc: "Clear sounds like 'B' as in 'Ball', 'P' as in 'Pen'." }
            ]
        },
        pronunciation: {
            title: "Master Your Pronunciation",
            icon: "mic_none",
            steps: [
                { title: "Common Greetings", desc: "Hello, Good morning, How's it going?, Long time no see." },
                { title: "The 'TH' Sound", desc: "Learn to place your tongue correctly for 'Think' vs 'This'." }
            ]
        },
        conversations: {
            title: "Daily Use Sentences",
            icon: "forum",
            steps: [
                { title: "Self Introduction", desc: "I am [Name], I work at..., I like to..., Nice to meet you." },
                { title: "Asking for Help", desc: "Could you help me?, I'm lost, Where is the...?, Can you repeat that?" }
            ]
        }
    };

    window.loadCategory = (cat) => {
        const data = categoryData[cat];
        if (!data) return;

        detailsContainer.innerHTML = `
            <div class="lesson-page">
                <span class="material-icons-round" style="font-size: 3rem; color: var(--primary-light);">${data.icon}</span>
                <h2>${data.title}</h2>
                ${data.steps.map(s => `
                    <div class="lesson-step">
                        <h4>${s.title}</h4>
                        <p>${s.desc}</p>
                        <button class="btn-icon" onclick="speakText('${s.title}. ${s.desc}')">
                            <span class="material-icons-round">volume_up</span> Hear Guide
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        overlay.classList.remove('hidden');
    };

    window.closeOverlay = () => overlay.classList.add('hidden');

    // --- CUTE SOUND EFFECT ---
    let audioCtx;
    window.playCuteSound = () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        // Cute "Boop" - High pitch sine wave sliding up
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    };

    const heroImg = document.querySelector('.float-img');
    if (heroImg) {
        heroImg.addEventListener('click', () => {
            window.playCuteSound();
            // Visual feedback - Flash brightness without breaking float animation
            heroImg.style.transition = 'filter 0.1s';
            heroImg.style.filter = 'brightness(1.4) drop-shadow(0 0 10px #ff79c6)';
            setTimeout(() => {
                heroImg.style.filter = '';
            }, 150);
        });
        heroImg.style.cursor = 'pointer';
        heroImg.title = "Click me!";
    }

    // --- FLOATING LETTERS EFFECT ---
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual) {
        setInterval(() => {
            // Multi-language character set
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz?!@#अआइईउऊऋएऐओऔकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसहश्रज्ञあいうえおかきくけこさしすせそたちつてとなにぬねのアイウエオカキクケコサシスセソ안녕하세요세계こんにちは你好世界αβγδεζηθικλμνξοπρστυφχψωДФГЛЖЯЙИЦУКЕЁ1234567890✨🌍📚💡🎓📝💭🗣️🎵👂🧠";
            const char = chars.charAt(Math.floor(Math.random() * chars.length));

            const span = document.createElement('span');
            span.textContent = char;
            span.classList.add('floating-letter');

            // --- PERIMETER SPAWN LOGIC ---
            // Spawn around the image (assume image radius ~150px-200px)
            const angle = Math.random() * Math.PI * 2;
            const startRadius = 180 + Math.random() * 50; // Start just outside the image center
            const travelDist = 150 + Math.random() * 100; // Float outwards by this much
            const endRadius = startRadius + travelDist;

            const sx = Math.cos(angle) * startRadius + 'px';
            const sy = Math.sin(angle) * startRadius + 'px';

            const ex = Math.cos(angle) * endRadius + 'px';
            const ey = Math.sin(angle) * endRadius + 'px';

            const rot = (Math.random() - 0.5) * 720 + 'deg';

            span.style.setProperty('--sx', sx);
            span.style.setProperty('--sy', sy);
            span.style.setProperty('--ex', ex);
            span.style.setProperty('--ey', ey);
            span.style.setProperty('--rot', rot);

            // Random font size variation
            span.style.fontSize = (1.2 + Math.random() * 1.5) + 'rem';

            // Random color tint
            const colors = ['#818cf8', '#f472b6', '#34d399', '#facc15', '#a78bfa'];
            span.style.color = colors[Math.floor(Math.random() * colors.length)];

            heroVisual.appendChild(span);

            // Cleanup
            setTimeout(() => {
                span.remove();
            }, 4000); // Match animation duration
        }, 400); // Spawn faster (every 400ms)
    }

});
