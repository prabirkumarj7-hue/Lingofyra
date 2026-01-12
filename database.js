/**
 * LINGOFYRA - CLIENT-SIDE DATABASE SYSTEM
 * A robust persistence layer using LocalStorage to simulate a real database.
 */

const LingofyraDB = {
    // --- USER MANAGEMENT ---
    users: {
        getAll: () => JSON.parse(localStorage.getItem('lingofyra_db_users') || '[]'),

        register: (email, password, name) => {
            const users = LingofyraDB.users.getAll();
            if (users.find(u => u.email === email)) return { success: false, message: "Email already exists!" };

            const newUser = { id: Date.now(), email, password, name, joined: new Date().toISOString() };
            users.push(newUser);
            localStorage.setItem('lingofyra_db_users', JSON.stringify(users));
            return { success: true, user: newUser };
        },

        authenticate: (email, password) => {
            const users = LingofyraDB.users.getAll();
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                // Return user without password for security
                const { password, ...safeUser } = user;
                return { success: true, user: safeUser };
            }
            return { success: false, message: "Invalid email or password" };
        }
    },

    // --- PROGRESS TRACKING ---
    progress: {
        saveMockTest: (userId, stage, score) => {
            const data = JSON.parse(localStorage.getItem('lingofyra_db_progress') || '{}');
            if (!data[userId]) data[userId] = { mockTests: [], dictionaryHistory: [] };

            data[userId].mockTests.push({
                stage,
                score,
                date: new Date().toISOString()
            });

            localStorage.setItem('lingofyra_db_progress', JSON.stringify(data));
        },

        getStats: (userId) => {
            const data = JSON.parse(localStorage.getItem('lingofyra_db_progress') || '{}');
            return data[userId] || { mockTests: [], dictionaryHistory: [] };
        }
    },

    // --- CACHE & HISTORY ---
    history: {
        addDictionarySearch: (userId, word) => {
            const data = JSON.parse(localStorage.getItem('lingofyra_db_progress') || '{}');
            if (!data[userId]) data[userId] = { mockTests: [], dictionaryHistory: [] };

            // Keep unique history
            if (!data[userId].dictionaryHistory.includes(word)) {
                data[userId].dictionaryHistory.unshift(word);
                data[userId].dictionaryHistory = data[userId].dictionaryHistory.slice(0, 20); // Keep last 20
            }

            localStorage.setItem('lingofyra_db_progress', JSON.stringify(data));
        }
    },

    // --- FEEDBACK STORAGE ---
    feedback: {
        add: (entry) => {
            const feedbacks = JSON.parse(localStorage.getItem('lingofyra_db_feedback') || '[]');
            feedbacks.push({
                ...entry,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('lingofyra_db_feedback', JSON.stringify(feedbacks));
        },
        getAll: () => JSON.parse(localStorage.getItem('lingofyra_db_feedback') || '[]')
    }
};

// Initialize some mock users if empty
if (LingofyraDB.users.getAll().length === 0) {
    LingofyraDB.users.register("demo@lingofyra.ai", "password123", "Demo Learner");
    LingofyraDB.users.register("admin@lingofyra.ai", "admin", "Admin");
}
