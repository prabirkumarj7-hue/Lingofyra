/**
 * LINGOFYRA - THEME MANAGER
 * Handles Light/Dark mode transitions and persistence.
 */

const ThemeManager = {
    init: () => {
        const savedTheme = localStorage.getItem('lingofyra_theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            ThemeManager.updateIcon(true);
        }
    },

    toggle: () => {
        const body = document.body;
        body.classList.toggle('light-mode');
        const isLight = body.classList.contains('light-mode');
        localStorage.setItem('lingofyra_theme', isLight ? 'light' : 'dark');
        ThemeManager.updateIcon(isLight);
    },

    updateIcon: (isLight) => {
        const icons = document.querySelectorAll('.theme-toggle-icon');
        icons.forEach(icon => {
            icon.textContent = isLight ? 'light_mode' : 'dark_mode';
        });
    }
};

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', ThemeManager.init);
window.toggleTheme = ThemeManager.toggle;
