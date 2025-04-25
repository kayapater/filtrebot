// ==UserScript==
// @name         Filtrebot
// @namespace    http://x.com/kayapater
// @version      2.1
// @description  Twitter/X İçerik Filtreleme Aracı
// @author       kayapater
// @match        https://x.com/*
// @match        https://twitter.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const defaultKeywords = [];

    const defaultCategories = {
        keywords: ['genel', 'futbol', 'siyaset', 'magazin', 'ozel'],
        accounts: ['genel', 'futbol', 'siyaset', 'magazin', 'ozel']
    };

    let settings = loadSettings();
    let stats = loadStats();
    
    let isPanelOpen = false;

    function saveSettings(settings) {
        GM_setValue("settings", settings);
        
        let keywordCount = 0;
        let accountCount = 0;
        
        for (const category in settings.keywordsByCategory) {
            keywordCount += settings.keywordsByCategory[category].length;
        }
        
        for (const category in settings.accountsByCategory) {
            accountCount += settings.accountsByCategory[category].length;
        }
        
        stats = {
            blockedKeywords: keywordCount,
            blockedAccounts: accountCount,
            totalBlocked: stats.totalBlocked || 0,
            blockedKeywordsDetail: stats.blockedKeywordsDetail || [],
            blockedAccountsDetail: stats.blockedAccountsDetail || []
        };
        
        GM_setValue("stats", stats);
    }

    function loadSettings() {
        const savedSettings = GM_getValue("settings", null);
        
        if (savedSettings) {
            return savedSettings;
        }
        
        const defaultSettings = {
            keywords: defaultKeywords,
            blockedAccounts: [],
            
            keywordsByCategory: {
                'genel': [],
                'futbol': [],
                'siyaset': [],
                'magazin': [],
                'ozel': []
            },
            accountsByCategory: {
                'genel': [],
                'futbol': [],
                'siyaset': [],
                'magazin': [],
                'ozel': []
            },
            categories: defaultCategories,
            
            accountDetails: {},
            
            blurLevel: 8,
            warningMessage: ' İçerik Filtrelendi',
            warningColor: '#1DA1F2',
            showReason: true,
            autoUpdate: true,
            enabled: true
        };
        
        return defaultSettings;
    }
    
    function loadStats() {
        return GM_getValue("stats", {
            blockedKeywords: 0,
            blockedAccounts: 0,
            totalBlocked: 0,
            blockedKeywordsDetail: [],
            blockedAccountsDetail: []
        });
    }

    // Stil ekle
    function addStyles() {
        GM_addStyle(`
            :root {
                --primary-color: #1da1f2;
                --primary-hover: #0c85d0;
                --secondary-color: #657786;
                --danger-color: #e0245e;
                --success-color: #17bf63;
                --warning-color: #ffad1f;
                --bg-color: #15202b;
                --bg-secondary: #192734;
                --text-color: #ffffff;
                --text-secondary: #8899a6;
                --border-color: #38444d;
                --shadow-color: rgba(101, 119, 134, 0.2);
                --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            
            #kuae-toggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: var(--primary-color);
                color: white;
                border: none;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                font-size: 24px;
                cursor: pointer;
                z-index: 10002;
                box-shadow: 0 4px 8px var(--shadow-color);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s, background-color 0.3s;
            }
            #kuae-toggle:hover {
                background-color: var(--primary-hover);
                transform: scale(1.1);
            }
            .kuae-blurred {
                filter: blur(${settings.blurLevel}px);
                transition: filter 0.3s ease;
            }
            .kuae-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(29, 161, 242, 0.9);
                color: white;
                padding: 12px 20px;
                font-size: 15px;
                font-weight: 500;
                z-index: 10000;
                border-radius: 30px;
                pointer-events: auto;
                text-align: center;
                max-width: 80%;
                box-shadow: 0 4px 12px var(--shadow-color);
                backdrop-filter: blur(4px);
                border: 1px solid rgba(255,255,255,0.2);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                opacity: 0.95;
                transition: opacity 0.3s, transform 0.3s;
                font-family: var(--font-family);
            }
            .kuae-wrapper:hover .kuae-overlay {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.05);
            }
            .kuae-wrapper {
                position: relative;
                display: inline-block;
            }
            .kuae-reason {
                display: block;
                font-size: 12px;
                margin-top: 6px;
                opacity: 0.9;
                font-weight: normal;
            }
            .kuae-category-badge {
                display: inline-block;
                background-color: rgba(255,255,255,0.25);
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 11px;
                margin-top: 6px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .kuae-notification {
                position: fixed;
                bottom: 80px;
                right: 20px;
                background-color: var(--primary-color);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10003;
                box-shadow: 0 4px 12px var(--shadow-color);
                font-size: 14px;
                opacity: 0;
                transform: translateY(100px);
                transition: all 0.3s ease;
                pointer-events: none;
                font-family: var(--font-family);
            }
            .kuae-notification.show {
                opacity: 1;
                transform: translateY(0);
            }
            .kuae-note-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                font-size: 12px;
                font-weight: bold;
                margin-left: 8px;
                cursor: pointer;
                transition: transform 0.2s;
                position: relative;
                background-color: var(--primary-color);
                color: white;
            }
            .kuae-note-icon:hover {
                transform: scale(1.2);
            }
            .kuae-note-tooltip {
                position: absolute;
                background-color: white;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 4px 12px var(--shadow-color);
                z-index: 10001;
                max-width: 300px;
                color: var(--text-color);
                font-weight: normal;
                font-size: 13px;
                line-height: 1.5;
                text-align: left;
                display: none;
                white-space: pre-wrap;
                word-break: break-word;
                pointer-events: auto;
                font-family: var(--font-family);
            }
            .kuae-note-icon:hover .kuae-note-tooltip {
                display: block;
                animation: kuae-fadeIn 0.2s;
            }
            
            #kuae-panel {
                position: fixed;
                top: 0;
                right: 0;
                width: 400px;
                height: 100vh;
                background-color: var(--bg-color);
                z-index: 10001;
                box-shadow: -2px 0 20px var(--shadow-color);
                transform: translateX(100%);
                transition: transform 0.3s ease;
                overflow-y: auto;
                padding: 0;
                box-sizing: border-box;
                font-family: var(--font-family);
                color: var(--text-color);
            }
            #kuae-panel.open {
                transform: translateX(0);
            }
            #kuae-panel-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0,0,0,0.5);
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
                backdrop-filter: blur(2px);
            }
            #kuae-panel-overlay.open {
                opacity: 1;
                visibility: visible;
            }
            .kuae-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
                background-color: var(--primary-color);
                color: white;
            }
            .kuae-panel-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            .kuae-panel-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: white;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }
            .kuae-panel-close:hover {
                background-color: rgba(255,255,255,0.2);
            }
            .kuae-panel-tabs {
                display: flex;
                background-color: var(--bg-color);
                border-bottom: 1px solid var(--border-color);
            }
            .kuae-panel-tab {
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 3px solid transparent;
                font-weight: 500;
                color: var(--text-secondary);
                transition: all 0.2s;
                flex: 1;
                text-align: center;
            }
            .kuae-panel-tab:hover {
                background-color: var(--bg-secondary);
                color: var(--primary-color);
            }
            .kuae-panel-tab.active {
                border-bottom: 3px solid var(--primary-color);
                color: var(--primary-color);
                font-weight: 600;
            }
            .kuae-panel-content {
                display: none;
                padding: 20px;
            }
            .kuae-panel-content.active {
                display: block;
            }
            .kuae-form-group {
                margin-bottom: 20px;
            }
            .kuae-form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: var(--text-color);
            }
            .kuae-form-group input, .kuae-form-group select, .kuae-form-group textarea {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                box-sizing: border-box;
                font-family: var(--font-family);
                font-size: 14px;
                transition: border-color 0.2s;
                background-color: var(--bg-secondary);
                color: var(--text-color);
            }
            .kuae-form-group input:focus, .kuae-form-group select:focus, .kuae-form-group textarea:focus {
                border-color: var(--primary-color);
                outline: none;
            }
            .kuae-form-group button {
                background-color: var(--primary-color);
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 30px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s;
                font-family: var(--font-family);
            }
            .kuae-form-group button:hover {
                background-color: var(--primary-hover);
            }
            .kuae-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                margin-top: 10px;
                background-color: var(--bg-secondary);
            }
            .kuae-list-item {
                padding: 10px 16px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .kuae-list-item:last-child {
                border-bottom: none;
            }
            .kuae-list-item-remove {
                background-color: var(--danger-color);
                color: white;
                border: none;
                border-radius: 30px;
                padding: 4px 10px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
            }
            .kuae-list-item-remove:hover {
                background-color: #c0113a;
            }
            .kuae-category-select {
                margin-bottom: 10px;
            }
            .kuae-status {
                padding: 12px;
                border-radius: 8px;
                margin-top: 10px;
                display: none;
                font-size: 14px;
            }
            .kuae-status.success {
                background-color: rgba(23, 191, 99, 0.1);
                color: var(--success-color);
                border: 1px solid var(--success-color);
                display: block;
            }
            .kuae-status.error {
                background-color: rgba(224, 36, 94, 0.1);
                color: var(--danger-color);
                border: 1px solid var(--danger-color);
                display: block;
            }
            @keyframes kuae-fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes kuae-fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
            }
            
            .kuae-btn {
                background-color: var(--primary-color);
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 30px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s;
                font-family: var(--font-family);
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .kuae-btn:hover {
                background-color: var(--primary-hover);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px var(--shadow-color);
            }
            .kuae-btn-danger {
                background-color: var(--danger-color);
            }
            .kuae-btn-danger:hover {
                background-color: #c0113a;
            }
            .kuae-btn-success {
                background-color: var(--success-color);
            }
            .kuae-btn-success:hover {
                background-color: #0f9d4f;
            }
            .kuae-btn-icon {
                margin-right: 8px;
            }
            .kuae-card {
                background-color: var(--bg-color);
                border-radius: 12px;
                box-shadow: 0 4px 12px var(--shadow-color);
                padding: 16px;
                margin-bottom: 16px;
            }
            .kuae-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 12px;
            }
            .kuae-card-title {
                font-size: 16px;
                font-weight: 600;
                margin: 0;
                color: var(--text-color);
            }
            .kuae-card-body {
                color: var(--text-secondary);
            }
            .kuae-stat-card {
                background-color: var(--bg-secondary);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
                text-align: center;
            }
            .kuae-stat-value {
                font-size: 24px;
                font-weight: 700;
                color: var(--primary-color);
                margin: 8px 0;
            }
            .kuae-stat-label {
                font-size: 14px;
                color: var(--text-secondary);
            }
            .kuae-popup-menu {
                position: absolute;
                bottom: 70px;
                right: 20px;
                background-color: var(--bg-color);
                border-radius: 12px;
                box-shadow: 0 4px 12px var(--shadow-color);
                padding: 8px 0;
                z-index: 10000;
                min-width: 200px;
                display: none;
                font-family: var(--font-family);
            }
            .kuae-popup-menu.open {
                display: block;
                animation: kuae-fadeIn 0.2s;
            }
            .kuae-popup-menu-item {
                padding: 10px 16px;
                cursor: pointer;
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
            }
            .kuae-popup-menu-item:hover {
                background-color: var(--bg-secondary);
            }
            .kuae-popup-menu-icon {
                margin-right: 8px;
                color: var(--primary-color);
            }
            
            .kuae-note-input-container {
                display: flex;
                flex-direction: column;
                gap: 10px;
                width: 100%;
            }
            
            .kuae-note-username {
                width: 100%;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid var(--border-color);
                background-color: var(--bg-secondary);
                color: var(--text-color);
            }
            
            .kuae-note-textarea {
                width: 100%;
                padding: 10px 12px;
                border-radius: 4px;
                border: 1px solid var(--border-color);
                background-color: var(--bg-secondary);
                color: var(--text-color);
                font-family: var(--font-family);
                resize: vertical;
                min-height: 80px;
            }
            
            .kuae-note-button {
                padding: 8px 16px;
                background-color: var(--primary-color);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
                align-self: flex-start;
            }
            
            .kuae-note-button:hover {
                background-color: var(--primary-hover);
            }
            
            .kuae-note-item {
                background-color: var(--bg-secondary);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 10px;
                border: 1px solid var(--border-color);
            }
            
            .kuae-note-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .kuae-note-username {
                font-weight: bold;
                color: var(--primary-color);
            }
            
            .kuae-note-content {
                padding: 10px;
                background-color: rgba(29, 161, 242, 0.1);
                border-radius: 4px;
                margin-bottom: 10px;
                color: var(--text-color);
                white-space: pre-wrap;
                word-break: break-word;
            }
            
            .kuae-note-actions {
                display: flex;
                gap: 8px;
            }
            
            .kuae-note-actions button {
                padding: 4px 8px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-size: 12px;
            }
            
            .kuae-note-edit {
                background-color: var(--primary-color);
                color: white;
            }
            
            .kuae-note-delete {
                background-color: var(--danger-color);
                color: white;
            }
            
            .kuae-note-block {
                background-color: var(--warning-color);
                color: black;
            }
            
            .kuae-badge {
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: bold;
            }
            
            .kuae-badge-blocked {
                background-color: var(--danger-color);
                color: white;
            }
            
            .kuae-badge-normal {
                background-color: var(--success-color);
                color: white;
            }
            
            .kuae-badge-category {
                background-color: var(--warning-color);
                color: black;
            }
            
            .kuae-empty-list {
                padding: 20px;
                text-align: center;
                color: var(--text-secondary);
                font-style: italic;
            }
            
            .kuae-tooltip {
                position: absolute;
                z-index: 10000;
                background-color: #15202b;
                color: #ffffff;
                padding: 16px 20px;
                border-radius: 8px;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
                max-width: 450px;
                min-width: 350px;
                font-size: 15px;
                line-height: 1.6;
                text-align: left;
                white-space: pre-wrap;
                word-break: break-word;
                pointer-events: auto;
                font-family: var(--font-family);
                border: 1px solid #444;
                transform: translateZ(0)
            }
            
            .kuae-note-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10001;
                background-color: #1a1a1a;
                color: #ffffff;
                padding: 20px 25px;
                border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);
                width: 450px;
                max-width: 90%;
                font-size: 15px;
                line-height: 1.6;
                text-align: left;
                font-family: var(--font-family);
                border: 1px solid #444;
            }
            
            .kuae-note-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 12px;
                border-bottom: 1px solid #444;
            }
            
            .kuae-note-popup-title {
                font-size: 18px;
                font-weight: bold;
                color: var(--primary-color);
            }
            
            .kuae-note-popup-close {
                cursor: pointer;
                font-size: 20px;
                color: #888;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            
            .kuae-note-popup-close:hover {
                background-color: rgba(255, 255, 255, 0.1);
                color: #fff;
            }
            
            .kuae-note-popup-content {
                margin-bottom: 15px;
                font-size: 16px;
                line-height: 1.6;
                white-space: pre-wrap;
                word-break: break-word;
            }
            
            .kuae-note-popup-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 15px;
                padding-top: 12px;
                border-top: 1px solid #444;
            }
            
            .kuae-note-popup-button {
                padding: 8px 16px;
                border-radius: 20px;
                border: none;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .kuae-note-popup-button.primary {
                background-color: var(--primary-color);
                color: white;
            }
            
            .kuae-note-popup-button.primary:hover {
                background-color: var(--primary-hover);
            }
            
            .kuae-note-popup-button.secondary {
                background-color: transparent;
                color: var(--text-color);
                border: 1px solid var(--border-color);
            }
            
            .kuae-note-popup-button.secondary:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .kuae-note-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 10000;
            }
        `);
    }

    // Not popup'ı göster
    function showNotePopup(username, note) {
        const oldPopup = document.querySelector('.kuae-note-popup-overlay');
        if (oldPopup) {
            oldPopup.remove();
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'kuae-note-popup-overlay';
        
        const popup = document.createElement('div');
        popup.className = 'kuae-note-popup';
        
        const header = document.createElement('div');
        header.className = 'kuae-note-popup-header';
        
        const title = document.createElement('div');
        title.className = 'kuae-note-popup-title';
        title.textContent = `@${username} için not`;
        
        const closeButton = document.createElement('div');
        closeButton.className = 'kuae-note-popup-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            overlay.remove();
        });
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        const content = document.createElement('div');
        content.className = 'kuae-note-popup-content';
        content.textContent = note;
        
        const footer = document.createElement('div');
        footer.className = 'kuae-note-popup-footer';
        
        const editButton = document.createElement('button');
        editButton.className = 'kuae-note-popup-button secondary';
        editButton.textContent = 'Düzenle';
        editButton.addEventListener('click', () => {
            if (document.getElementById('kuae-panel')) {
                const tabButtons = document.querySelectorAll('.kuae-tab-button');
                tabButtons.forEach(button => {
                    if (button.textContent.includes('Notlar')) {
                        button.click();
                    }
                });
                
                const noteUsernameInput = document.getElementById('kuae-account-note-username');
                const noteInput = document.getElementById('kuae-account-note');
                
                if (noteUsernameInput && noteInput) {
                    noteUsernameInput.value = username;
                    noteInput.value = note;
                    noteInput.focus();
                }
            } else {
                togglePanel();
                
                setTimeout(() => {
                    const tabButtons = document.querySelectorAll('.kuae-tab-button');
                    tabButtons.forEach(button => {
                        if (button.textContent.includes('Notlar')) {
                            button.click();
                        }
                    });
                    
                    const noteUsernameInput = document.getElementById('kuae-account-note-username');
                    const noteInput = document.getElementById('kuae-account-note');
                    
                    if (noteUsernameInput && noteInput) {
                        noteUsernameInput.value = username;
                        noteInput.value = note;
                        noteInput.focus();
                    }
                }, 300);
            }
            
            overlay.remove();
        });
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'kuae-note-popup-button primary';
        closeBtn.textContent = 'Kapat';
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });
        
        footer.appendChild(editButton);
        footer.appendChild(closeBtn);
        
        popup.appendChild(header);
        popup.appendChild(content);
        popup.appendChild(footer);
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        document.addEventListener('keydown', function escClose(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escClose);
            }
        });
    }

    // Anahtar kelime kontrolü
    function containsKeyword(text) {
        if (!text) return false;
        
        text = text.toLowerCase();
        
        for (const category in settings.keywordsByCategory) {
            for (const keyword of settings.keywordsByCategory[category]) {
                if (text.includes(keyword.toLowerCase())) {
                    return {
                        found: true,
                        keyword: keyword,
                        category: category
                    };
                }
            }
        }
        
        return { found: false };
    }

    // Hesap kontrolü
    function isBlockedAccount(username) {
        if (!username) return false;
        
        username = username.toLowerCase().replace('@', '');
        
        for (const category in settings.accountsByCategory) {
            if (settings.accountsByCategory[category].includes(username)) {
                return {
                    blocked: true,
                    category: category
                };
            }
        }
        
        return { blocked: false };
    }

    // Yeni gönderileri izleme
    function observeNewPosts() {
        const observer = new MutationObserver((mutations) => {
            let shouldFilter = false;
            
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    shouldFilter = true;
                }
            });
            
            if (shouldFilter) {
                filterPosts();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Gönderileri filtreleme
    function filterPosts() {
        if (!settings.enabled) return;
        
        document.querySelectorAll('article').forEach(article => {
            if (article.dataset.kuaeProcessed === 'true') return;
            
            article.dataset.kuaeProcessed = 'true';
            
            const tweetText = article.querySelector('[data-testid="tweetText"]')?.innerText || '';
            
            const usernameElement = article.querySelector('[data-testid="User-Name"] a[href*="/"]');
            const username = usernameElement ? usernameElement.href.split('/').pop() : '';
            
            const keywordCheck = containsKeyword(tweetText);
            
            const accountCheck = isBlockedAccount(username);
            
            if (keywordCheck.found || accountCheck.blocked) {
                blurPost(article, keywordCheck, accountCheck);
                
                stats.totalBlocked++;
                GM_setValue("stats", stats);
            }
            
            if (username && settings.accountDetails[username]) {
                addNoteIcon(article, settings.accountDetails[username]);
            }
        });
    }

    // Gönderiyi bulanıklaştırma
    function blurPost(article, keywordCheck, accountCheck) {
        const wrapper = document.createElement('div');
        wrapper.className = 'kuae-wrapper';
        
        const clone = article.cloneNode(true);
        clone.classList.add('kuae-blurred');
        
        article.style.display = 'none';
        
        wrapper.appendChild(clone);
        
        const overlay = document.createElement('div');
        overlay.className = 'kuae-overlay';
        
        overlay.innerHTML = settings.warningMessage;
        
        if (settings.showReason) {
            let reasonText = '';
            let categoryBadge = '';
            
            if (keywordCheck.found) {
                reasonText = `Anahtar kelime: "${keywordCheck.keyword}"`;
                categoryBadge = `<span class="kuae-category-badge">${keywordCheck.category}</span>`;
            } else if (accountCheck.blocked) {
                reasonText = `Engellenen hesap: @${article.querySelector('[data-testid="User-Name"] a[href*="/"]').href.split('/').pop()}`;
                categoryBadge = `<span class="kuae-category-badge">${accountCheck.category}</span>`;
            }
            
            if (reasonText) {
                overlay.innerHTML += `<span class="kuae-reason">${reasonText}</span>${categoryBadge}`;
            }
        }
        
        wrapper.appendChild(overlay);
        
        article.parentNode.insertBefore(wrapper, article);
        
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.style.display = 'none';
            article.style.display = '';
        });
    }

    // Hesap notu ikonu ekleme
    function addNoteIcon(article, accountDetails) {
        const userNameElement = article.querySelector('[data-testid="User-Name"]');
        
        if (!userNameElement) return;
        
        const noteIcon = document.createElement('div');
        noteIcon.className = 'kuae-note-icon';
        noteIcon.innerHTML = '📝';
        noteIcon.style.backgroundColor = settings.warningColor;
        noteIcon.style.color = 'white';
        
        noteIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            showNotePopup(article.querySelector('[data-testid="User-Name"] a[href*="/"]').href.split('/').pop(), accountDetails.note);
        });
        
        userNameElement.appendChild(noteIcon);
    }

    // Stil ekle
    addStyles();

    // Ayarlar butonunu oluşturma
    function createToggleButton() {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'kuae-toggle';
        toggleButton.innerHTML = '⚙️';
        toggleButton.title = 'Eklenti Ayarları';
        document.body.appendChild(toggleButton);

        toggleButton.addEventListener('click', () => {
            togglePanel();
        });
    }

    // Bildirim gösterme
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.id = 'kuae-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // Panel açma/kapama
    function togglePanel() {
        if (isPanelOpen) {
            const panel = document.getElementById('kuae-panel');
            const overlay = document.getElementById('kuae-panel-overlay');
            
            if (panel) panel.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
            
            isPanelOpen = false;
        } else {
            if (!document.getElementById('kuae-panel')) {
                createPanel();
                addPanelEvents();
            }
            
            const panel = document.getElementById('kuae-panel');
            const overlay = document.getElementById('kuae-panel-overlay');
            
            if (panel) panel.classList.add('open');
            if (overlay) overlay.classList.add('open');
            
            isPanelOpen = true;
            
            updatePanelContent();
        }
    }

    // Panel oluşturma
    function createPanel() {
        const overlay = document.createElement('div');
        overlay.id = 'kuae-panel-overlay';
        overlay.addEventListener('click', togglePanel);
        document.body.appendChild(overlay);
        
        const panel = document.createElement('div');
        panel.id = 'kuae-panel';
        document.body.appendChild(panel);
        
        const header = document.createElement('div');
        header.className = 'kuae-panel-header';
        header.innerHTML = `
            <h2>Filtrebot</h2>
            <button class="kuae-panel-close">&times;</button>
        `;
        panel.appendChild(header);
        
        // Kapat butonu
        header.querySelector('.kuae-panel-close').addEventListener('click', togglePanel);
        
        // Panel tabs
        const tabs = document.createElement('div');
        tabs.className = 'kuae-panel-tabs';
        tabs.innerHTML = `
            <div class="kuae-panel-tab active" data-tab="keywords">Anahtar Kelimeler</div>
            <div class="kuae-panel-tab" data-tab="accounts">Hesaplar</div>
            <div class="kuae-panel-tab" data-tab="notes">Notlar</div>
            <div class="kuae-panel-tab" data-tab="settings">Ayarlar</div>
            <div class="kuae-panel-tab" data-tab="stats">İstatistikler</div>
        `;
        panel.appendChild(tabs);
        
        // Tab click olayları
        tabs.querySelectorAll('.kuae-panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Aktif tab'ı değiştir
                tabs.querySelectorAll('.kuae-panel-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // İlgili içeriği göster
                panel.querySelectorAll('.kuae-panel-content').forEach(c => c.classList.remove('active'));
                panel.querySelector(`.kuae-panel-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
            });
        });
        
        // Anahtar Kelimeler tab içeriği
        const keywordsContent = document.createElement('div');
        keywordsContent.className = 'kuae-panel-content active';
        keywordsContent.dataset.tab = 'keywords';
        keywordsContent.innerHTML = `
            <div class="kuae-form-group">
                <label for="kuae-keyword-category">Kategori:</label>
                <select id="kuae-keyword-category" class="kuae-category-select"></select>
                <button id="kuae-add-keyword-category" style="margin-left: 10px;">+ Kategori Ekle</button>
            </div>
            <div class="kuae-form-group">
                <label for="kuae-keyword-input">Anahtar Kelime Ekle:</label>
                <div style="display: flex;">
                    <input type="text" id="kuae-keyword-input" placeholder="Anahtar kelime...">
                    <button id="kuae-add-keyword" style="margin-left: 10px;">Ekle</button>
                </div>
            </div>
            <div class="kuae-form-group">
                <label for="kuae-keywords-bulk">Toplu Anahtar Kelime Ekle:</label>
                <textarea id="kuae-keywords-bulk" placeholder="Her satıra bir anahtar kelime yazın..." rows="4"></textarea>
                <button id="kuae-add-keywords-bulk" style="margin-top: 10px;">Toplu Ekle</button>
            </div>
            <div id="kuae-keywords-status" class="kuae-status"></div>
            <h3>Anahtar Kelimeler</h3>
            <div id="kuae-keywords-list" class="kuae-list"></div>
        `;
        panel.appendChild(keywordsContent);
        
        // Hesaplar tab içeriği
        const accountsContent = document.createElement('div');
        accountsContent.className = 'kuae-panel-content';
        accountsContent.dataset.tab = 'accounts';
        accountsContent.innerHTML = `
            <div class="kuae-form-group">
                <label for="kuae-account-category">Kategori:</label>
                <select id="kuae-account-category" class="kuae-category-select"></select>
                <button id="kuae-add-account-category" style="margin-left: 10px;">+ Kategori Ekle</button>
            </div>
            <div class="kuae-form-group">
                <label for="kuae-account-input">Hesap Ekle:</label>
                <div style="display: flex;">
                    <input type="text" id="kuae-account-input" placeholder="Kullanıcı adı (@ olmadan)...">
                    <button id="kuae-add-account" style="margin-left: 10px;">Ekle</button>
                </div>
            </div>
            <div class="kuae-form-group">
                <label for="kuae-accounts-bulk">Toplu Hesap Ekle:</label>
                <textarea id="kuae-accounts-bulk" placeholder="Her satıra bir kullanıcı adı yazın (@ olmadan)..." rows="4"></textarea>
                <button id="kuae-add-accounts-bulk" style="margin-top: 10px;">Toplu Ekle</button>
            </div>
            <div id="kuae-accounts-status" class="kuae-status"></div>
            <h3>Engellenen Hesaplar</h3>
            <div id="kuae-accounts-list" class="kuae-list"></div>
        `;
        panel.appendChild(accountsContent);
        
        // Notlar tab içeriği
        const notesContent = document.createElement('div');
        notesContent.className = 'kuae-panel-content';
        notesContent.dataset.tab = 'notes';
        notesContent.innerHTML = `
            <div class="kuae-form-group">
                <label for="kuae-account-note-username">Hesap Notu Ekle:</label>
                <div class="kuae-note-input-container">
                    <input type="text" id="kuae-account-note-username" placeholder="Kullanıcı adı (@ olmadan)..." class="kuae-note-username">
                    <textarea id="kuae-account-note" placeholder="Not..." rows="3" class="kuae-note-textarea"></textarea>
                    <button id="kuae-add-account-note" class="kuae-note-button">Not Ekle</button>
                </div>
            </div>
            <div id="kuae-notes-status" class="kuae-status"></div>
            <h3>Eklenen Notlar</h3>
            <div id="kuae-notes-list" class="kuae-list"></div>
        `;
        panel.appendChild(notesContent);
        
        // Ayarlar tab içeriği
        const settingsContent = document.createElement('div');
        settingsContent.className = 'kuae-panel-content';
        settingsContent.dataset.tab = 'settings';
        settingsContent.innerHTML = `
            <div class="kuae-form-group">
                <label for="kuae-blur-level">Bulanıklaştırma Seviyesi:</label>
                <input type="range" id="kuae-blur-level" min="1" max="20" value="${settings.blurLevel}">
                <span id="kuae-blur-level-value">${settings.blurLevel}px</span>
            </div>
            <div class="kuae-form-group">
                <label for="kuae-warning-message">Uyarı Mesajı:</label>
                <input type="text" id="kuae-warning-message" value="${settings.warningMessage}">
            </div>
            <div class="kuae-form-group">
                <label for="kuae-warning-color">Uyarı Rengi:</label>
                <input type="color" id="kuae-warning-color" value="${settings.warningColor}">
            </div>
            <div class="kuae-form-group">
                <label>
                    <input type="checkbox" id="kuae-show-reason" ${settings.showReason ? 'checked' : ''}>
                    Filtreleme nedenini göster
                </label>
            </div>
            <div class="kuae-form-group">
                <label>
                    <input type="checkbox" id="kuae-enabled" ${settings.enabled ? 'checked' : ''}>
                    Filtreleri etkinleştir
                </label>
            </div>
            <div class="kuae-form-group">
                <button id="kuae-save-settings">Ayarları Kaydet</button>
            </div>
            <div class="kuae-form-group">
                <button id="kuae-export-settings">Ayarları Dışa Aktar</button>
                <button id="kuae-import-settings" style="margin-left: 10px;">Ayarları İçe Aktar</button>
                <input type="file" id="kuae-import-file" style="display: none;">
            </div>
            <div class="kuae-form-group">
                <button id="kuae-reset-settings" style="background-color: #dc3545;">Ayarları Sıfırla</button>
            </div>
            <div id="kuae-settings-status" class="kuae-status"></div>
        `;
        panel.appendChild(settingsContent);
        
        // İstatistikler tab içeriği
        const statsContent = document.createElement('div');
        statsContent.className = 'kuae-panel-content';
        statsContent.dataset.tab = 'stats';
        statsContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3>İstatistikler</h3>
                <p>Anahtar Kelime Sayısı: <strong id="kuae-stat-keywords">${stats.blockedKeywords}</strong></p>
                <p>Engellenen Hesap Sayısı: <strong id="kuae-stat-accounts">${stats.blockedAccounts}</strong></p>
                <p>Toplam Engellenen İçerik: <strong id="kuae-stat-total">${stats.totalBlocked}</strong></p>
            </div>
            <div class="kuae-form-group">
                <button id="kuae-reset-stats" style="background-color: #dc3545;">İstatistikleri Sıfırla</button>
            </div>
        `;
        panel.appendChild(statsContent);
        
        // Panel olaylarını ekle
        addPanelEvents();
    }
    
    // Panel olaylarını ekle
    function addPanelEvents() {
        // Kategori ekleme
        document.getElementById('kuae-add-keyword-category').addEventListener('click', () => {
            const categoryName = prompt('Kategori adı:');
            
            if (categoryName && categoryName.trim()) {
                const trimmedName = categoryName.trim();
                
                // Kategori zaten var mı kontrol et
                if (!settings.categories.keywords.includes(trimmedName)) {
                    settings.categories.keywords.push(trimmedName);
                    settings.keywordsByCategory[trimmedName] = [];
                    
                    saveSettings(settings);
                    updatePanelContent();
                    showNotification(`"${trimmedName}" kategorisi eklendi!`);
                } else {
                    showNotification(`"${trimmedName}" kategorisi zaten var!`);
                }
            }
        });
        
        document.getElementById('kuae-add-account-category').addEventListener('click', () => {
            const categoryName = prompt('Kategori adı:');
            
            if (categoryName && categoryName.trim()) {
                const trimmedName = categoryName.trim();
                
                // Kategori zaten var mı kontrol et
                if (!settings.categories.accounts.includes(trimmedName)) {
                    settings.categories.accounts.push(trimmedName);
                    settings.accountsByCategory[trimmedName] = [];
                    
                    saveSettings(settings);
                    updatePanelContent();
                    showNotification(`"${trimmedName}" kategorisi eklendi!`);
                } else {
                    showNotification(`"${trimmedName}" kategorisi zaten var!`);
                }
            }
        });
        
        // Anahtar kelime ekleme
        document.getElementById('kuae-add-keyword').addEventListener('click', () => {
            const keywordInput = document.getElementById('kuae-keyword-input');
            const keyword = keywordInput.value.trim();
            
            if (keyword) {
                const category = document.getElementById('kuae-keyword-category').value;
                
                if (category) {
                    settings.keywordsByCategory[category].push(keyword);
                    saveSettings(settings);
                    updatePanelContent();
                }
                
                keywordInput.value = '';
            }
        });
        
        // Toplu anahtar kelime ekleme
        document.getElementById('kuae-add-keywords-bulk').addEventListener('click', () => {
            const keywordsBulk = document.getElementById('kuae-keywords-bulk').value.trim();
            const keywords = keywordsBulk.split('\n').map(k => k.trim());
            
            if (keywords.length) {
                const category = document.getElementById('kuae-keyword-category').value;
                
                if (category) {
                    settings.keywordsByCategory[category].push(...keywords);
                    saveSettings(settings);
                    updatePanelContent();
                }
                
                document.getElementById('kuae-keywords-bulk').value = '';
            }
        });
        
        // Hesap ekleme
        document.getElementById('kuae-add-account').addEventListener('click', () => {
            const accountInput = document.getElementById('kuae-account-input');
            const account = accountInput.value.trim();
            
            if (account) {
                const category = document.getElementById('kuae-account-category').value;
                
                if (category) {
                    settings.accountsByCategory[category].push(account);
                    saveSettings(settings);
                    updatePanelContent();
                }
                
                accountInput.value = '';
            }
        });
        
        // Toplu hesap ekleme
        document.getElementById('kuae-add-accounts-bulk').addEventListener('click', () => {
            const accountsBulk = document.getElementById('kuae-accounts-bulk').value.trim();
            const accounts = accountsBulk.split('\n').map(a => a.trim());
            
            if (accounts.length) {
                const category = document.getElementById('kuae-account-category').value;
                
                if (category) {
                    settings.accountsByCategory[category].push(...accounts);
                    saveSettings(settings);
                    updatePanelContent();
                }
                
                document.getElementById('kuae-accounts-bulk').value = '';
            }
        });
        
        // Hesap notu ekleme
        document.getElementById('kuae-add-account-note').addEventListener('click', () => {
            const accountNoteUsername = document.getElementById('kuae-account-note-username').value.trim().toLowerCase();
            const accountNote = document.getElementById('kuae-account-note').value.trim();
            
            if (accountNoteUsername && accountNote) {
                // Hesap detayları nesnesi yoksa oluştur
                if (!settings.accountDetails) {
                    settings.accountDetails = {};
                }
                
                // Hesap detayları içinde hesap yoksa oluştur
                if (!settings.accountDetails[accountNoteUsername]) {
                    settings.accountDetails[accountNoteUsername] = {};
                }
                
                settings.accountDetails[accountNoteUsername].note = accountNote;
                
                // NOT: Artık hesabı otomatik olarak engellenen hesaplar listesine eklemiyoruz
                // Sadece not ekliyoruz
                
                saveSettings(settings);
                updatePanelContent(); // Panel içeriğini güncelle
                
                showNotification(`@${accountNoteUsername} için not eklendi!`);
                return true;
            }
        });
        
        // Ayarları kaydetme
        document.getElementById('kuae-save-settings').addEventListener('click', () => {
            const blurLevel = document.getElementById('kuae-blur-level').value;
            const warningMessage = document.getElementById('kuae-warning-message').value;
            const warningColor = document.getElementById('kuae-warning-color').value;
            const showReason = document.getElementById('kuae-show-reason').checked;
            const enabled = document.getElementById('kuae-enabled').checked;
            
            settings.blurLevel = blurLevel;
            settings.warningMessage = warningMessage;
            settings.warningColor = warningColor;
            settings.showReason = showReason;
            settings.enabled = enabled;
            
            saveSettings(settings);
            updatePanelContent();
        });
        
        // Ayarları dışa aktarma
        document.getElementById('kuae-export-settings').addEventListener('click', () => {
            const exportData = JSON.stringify(settings, null, 2);
            const exportBlob = new Blob([exportData], { type: 'application/json' });
            const exportUrl = URL.createObjectURL(exportBlob);
            const exportLink = document.createElement('a');
            exportLink.href = exportUrl;
            exportLink.download = 'kuae-settings.json';
            exportLink.click();
        });
        
        // Ayarları içe aktarma
        document.getElementById('kuae-import-settings').addEventListener('click', () => {
            document.getElementById('kuae-import-file').click();
        });
        
        document.getElementById('kuae-import-file').addEventListener('change', (e) => {
            const importFile = e.target.files[0];
            
            if (importFile) {
                const importReader = new FileReader();
                importReader.onload = (e) => {
                    const importData = JSON.parse(e.target.result);
                    settings = importData;
                    saveSettings(settings);
                    updatePanelContent();
                };
                importReader.readAsText(importFile);
            }
        });
        
        // Ayarları sıfırlama
        document.getElementById('kuae-reset-settings').addEventListener('click', () => {
            settings = loadSettings();
            saveSettings(settings);
            updatePanelContent();
        });
        
        // İstatistikleri sıfırlama
        document.getElementById('kuae-reset-stats').addEventListener('click', () => {
            stats = loadStats();
            GM_setValue("stats", stats);
            updatePanelContent();
        });
    }
    
    // Panel içeriğini güncelle
    function updatePanelContent() {
        // Kategori seçeneklerini güncelle
        const keywordCategories = document.getElementById('kuae-keyword-category');
        const accountCategories = document.getElementById('kuae-account-category');
        
        if (keywordCategories) {
            keywordCategories.innerHTML = '';
            
            settings.categories.keywords.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                keywordCategories.appendChild(option);
            });
        }
        
        if (accountCategories) {
            accountCategories.innerHTML = '';
            
            settings.categories.accounts.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                accountCategories.appendChild(option);
            });
        }
        
        // Anahtar kelime listesini güncelle
        const keywordsList = document.getElementById('kuae-keywords-list');
        
        if (keywordsList) {
            keywordsList.innerHTML = '';
            
            Object.keys(settings.keywordsByCategory).forEach(category => {
                if (settings.keywordsByCategory[category].length > 0) {
                    const categoryHeader = document.createElement('div');
                    categoryHeader.className = 'kuae-list-category';
                    categoryHeader.textContent = category;
                    keywordsList.appendChild(categoryHeader);
                    
                    settings.keywordsByCategory[category].forEach(keyword => {
                        const keywordItem = document.createElement('div');
                        keywordItem.className = 'kuae-list-item';
                        keywordItem.innerHTML = `
                            <span>${keyword}</span>
                            <button class="kuae-list-item-remove" data-category="${category}" data-keyword="${keyword}">&times;</button>
                        `;
                        keywordsList.appendChild(keywordItem);
                    });
                }
            });
            
            // Kaldırma olayları
            document.querySelectorAll('.kuae-list-item-remove[data-keyword]').forEach(button => {
                button.addEventListener('click', () => {
                    const category = button.dataset.category;
                    const keyword = button.dataset.keyword;
                    
                    const index = settings.keywordsByCategory[category].indexOf(keyword);
                    if (index !== -1) {
                        settings.keywordsByCategory[category].splice(index, 1);
                        saveSettings(settings);
                        updatePanelContent();
                    }
                });
            });
        }
        
        // Hesap listesini güncelle
        const accountsList = document.getElementById('kuae-accounts-list');
        
        if (accountsList) {
            accountsList.innerHTML = '';
            
            Object.keys(settings.accountsByCategory).forEach(category => {
                if (settings.accountsByCategory[category].length > 0) {
                    const categoryHeader = document.createElement('div');
                    categoryHeader.className = 'kuae-list-category';
                    categoryHeader.textContent = category;
                    accountsList.appendChild(categoryHeader);
                    
                    settings.accountsByCategory[category].forEach(account => {
                        const accountItem = document.createElement('div');
                        accountItem.className = 'kuae-list-item';
                        
                        // Not varsa göster
                        let noteInfo = '';
                        if (settings.accountDetails && settings.accountDetails[account] && settings.accountDetails[account].note) {
                            noteInfo = `
                                <div class="kuae-account-note">
                                    <span class="kuae-account-note-icon">📝</span>
                                    <span class="kuae-account-note-text">${settings.accountDetails[account].note}</span>
                                </div>
                            `;
                        }
                        
                        accountItem.innerHTML = `
                            <div class="kuae-account-info">
                                <span>@${account}</span>
                                ${noteInfo}
                            </div>
                            <button class="kuae-list-item-remove" data-category="${category}" data-account="${account}">&times;</button>
                        `;
                        accountsList.appendChild(accountItem);
                    });
                }
            });
            
            // Kaldırma olayları
            document.querySelectorAll('.kuae-list-item-remove[data-account]').forEach(button => {
                button.addEventListener('click', () => {
                    const category = button.dataset.category;
                    const account = button.dataset.account;
                    
                    const index = settings.accountsByCategory[category].indexOf(account);
                    if (index !== -1) {
                        settings.accountsByCategory[category].splice(index, 1);
                        saveSettings(settings);
                        updatePanelContent();
                    }
                });
            });
        }
        
        // Not listesini güncelle
        const notesList = document.getElementById('kuae-notes-list');
        
        if (notesList && settings.accountDetails) {
            notesList.innerHTML = '';
            
            const accounts = Object.keys(settings.accountDetails);
            
            if (accounts.length > 0) {
                accounts.forEach(account => {
                    if (settings.accountDetails[account] && settings.accountDetails[account].note) {
                        const noteItem = document.createElement('div');
                        noteItem.className = 'kuae-note-item';
                        
                        // Hesabın hangi kategoride olduğunu kontrol et
                        let accountCategory = '';
                        let isBlocked = false;
                        
                        Object.keys(settings.accountsByCategory).forEach(category => {
                            if (settings.accountsByCategory[category].includes(account)) {
                                accountCategory = category;
                                isBlocked = true;
                            }
                        });
                        
                        const statusBadge = isBlocked ? 
                            `<span class="kuae-badge kuae-badge-blocked">Engellendi</span>` : 
                            `<span class="kuae-badge kuae-badge-normal">Normal</span>`;
                        
                        noteItem.innerHTML = `
                            <div class="kuae-note-header">
                                <span class="kuae-note-username">@${account}</span>
                                ${statusBadge}
                                ${accountCategory ? `<span class="kuae-badge kuae-badge-category">${accountCategory}</span>` : ''}
                            </div>
                            <div class="kuae-note-content">${settings.accountDetails[account].note}</div>
                            <div class="kuae-note-actions">
                                <button class="kuae-note-edit" data-account="${account}">Düzenle</button>
                                <button class="kuae-note-delete" data-account="${account}">Sil</button>
                                ${!isBlocked ? `<button class="kuae-note-block" data-account="${account}">Engelle</button>` : ''}
                            </div>
                        `;
                        
                        notesList.appendChild(noteItem);
                    }
                });
                
                // Not düzenleme olayları
                document.querySelectorAll('.kuae-note-edit').forEach(button => {
                    button.addEventListener('click', () => {
                        const account = button.dataset.account;
                        const note = settings.accountDetails[account].note;
                        
                        document.getElementById('kuae-account-note-username').value = account;
                        document.getElementById('kuae-account-note').value = note;
                    });
                });
                
                // Not silme olayları
                document.querySelectorAll('.kuae-note-delete').forEach(button => {
                    button.addEventListener('click', () => {
                        const account = button.dataset.account;
                        
                        if (confirm(`@${account} için notu silmek istediğinize emin misiniz?`)) {
                            if (settings.accountDetails[account]) {
                                delete settings.accountDetails[account].note;
                                
                                // Eğer başka bir detay yoksa, hesap detaylarını tamamen sil
                                if (Object.keys(settings.accountDetails[account]).length === 0) {
                                    delete settings.accountDetails[account];
                                }
                                
                                saveSettings(settings);
                                updatePanelContent();
                                showNotification(`@${account} için not silindi!`);
                            }
                        }
                    });
                });
                
                // Hesabı engelleme olayları
                document.querySelectorAll('.kuae-note-block').forEach(button => {
                    button.addEventListener('click', () => {
                        const account = button.dataset.account;
                        
                        if (confirm(`@${account} hesabını engellemek istediğinize emin misiniz?`)) {
                            // Hesabı genel kategoriye ekle
                            if (!settings.accountsByCategory['genel'].includes(account)) {
                                settings.accountsByCategory['genel'].push(account);
                                saveSettings(settings);
                                updatePanelContent();
                                showNotification(`@${account} hesabı engellendi!`);
                            }
                        }
                    });
                });
            } else {
                notesList.innerHTML = '<div class="kuae-empty-list">Henüz not eklenmemiş.</div>';
            }
        }
    }

    // Menü komutları
    function registerMenuCommands() {
        GM_registerMenuCommand('Ayarları Aç', () => {
            togglePanel();
        });
        
        GM_registerMenuCommand('Filtreleri Etkinleştir/Devre Dışı Bırak', () => {
            settings.enabled = !settings.enabled;
            saveSettings(settings);
            showNotification(settings.enabled ? 'Filtreler etkinleştirildi!' : 'Filtreler devre dışı bırakıldı!');
            location.reload();
        });
    }

    // Yeni gönderileri izle
    observeNewPosts();

    // Gönderileri filtrele
    function filterContent() {
        // Tweet içeriklerini filtrele
        const tweets = document.querySelectorAll('[data-testid="tweet"], [data-testid="tweetText"]');
        
        tweets.forEach(tweet => {
            if (tweet.hasAttribute('data-kuae-filtered')) return;
            
            const tweetText = tweet.textContent.toLowerCase();
            const tweetContainer = tweet.closest('article') || tweet.closest('[data-testid="tweet"]');
            
            if (!tweetContainer) return;
            
            // Kullanıcı adını bul
            const userElement = tweetContainer.querySelector('[data-testid="User-Name"], [data-testid="UserName"]');
            if (!userElement) return;
            
            const userNameElement = userElement.querySelector('a[href*="/"]');
            if (!userNameElement) return;
            
            const userHref = userNameElement.getAttribute('href');
            const userName = userHref.split('/').pop().toLowerCase();
            
            // Anahtar kelime kontrolü
            let matchedKeyword = null;
            let matchedCategory = null;
            
            Object.keys(settings.keywordsByCategory).forEach(category => {
                settings.keywordsByCategory[category].forEach(keyword => {
                    if (tweetText.includes(keyword.toLowerCase())) {
                        matchedKeyword = keyword;
                        matchedCategory = category;
                    }
                });
            });
            
            // Hesap kontrolü
            let isBlockedAccount = false;
            let accountCategory = null;
            
            Object.keys(settings.accountsByCategory).forEach(category => {
                if (settings.accountsByCategory[category].includes(userName)) {
                    isBlockedAccount = true;
                    accountCategory = category;
                }
            });
            
            // Not eklenmiş ama engellenmemiş hesapları kontrol et
            const hasNote = settings.accountDetails && settings.accountDetails[userName] && settings.accountDetails[userName].note;
            
            if (matchedKeyword || isBlockedAccount && settings.enabled && !tweetContainer.hasAttribute('data-kuae-filtered')) {
                // Tweet'i bulanıklaştır
                tweetContainer.style.filter = `blur(${settings.blurLevel}px)`;
                tweetContainer.style.transition = 'filter 0.3s ease';
                
                // Uyarı simgesi ekle
                const warningIcon = document.createElement('div');
                warningIcon.className = 'kuae-warning-icon';
                warningIcon.innerHTML = '⚠️';
                warningIcon.style.position = 'absolute';
                warningIcon.style.top = '10px';
                warningIcon.style.right = '10px';
                warningIcon.style.backgroundColor = settings.warningColor;
                warningIcon.style.color = 'white';
                warningIcon.style.width = '24px';
                warningIcon.style.height = '24px';
                warningIcon.style.borderRadius = '50%';
                warningIcon.style.display = 'flex';
                warningIcon.style.alignItems = 'center';
                warningIcon.style.justifyContent = 'center';
                warningIcon.style.fontSize = '14px';
                warningIcon.style.fontWeight = 'bold';
                warningIcon.style.zIndex = '2';
                warningIcon.style.cursor = 'pointer';
                warningIcon.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                
                // Tooltip içeriği
                let tooltipContent = settings.warningMessage;
                
                if (settings.showReason) {
                    if (matchedKeyword) {
                        tooltipContent = `Anahtar kelime: "${matchedKeyword}"`;
                    } else if (isBlockedAccount) {
                        tooltipContent = `Engellenen hesap: @${userName}`;
                        
                        // Not varsa göster
                        if (hasNote) {
                            tooltipContent += `\nNot: ${settings.accountDetails[userName].note}`;
                        }
                    }
                }
                
                warningIcon.title = tooltipContent;
                
                // Pozisyon ayarı için container'ı relative yap
                tweetContainer.style.position = 'relative';
                
                // Simgeyi ekle
                tweetContainer.appendChild(warningIcon);
                
                // Uyarı simgesine tıklama olayı
                warningIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Tooltip göster
                    showTooltip(warningIcon, tooltipContent);
                });
                
                // Tıklama olayı ekle
                tweetContainer.addEventListener('click', (e) => {
                    // Eğer tweet zaten görünürse, olayı engelleme
                    if (tweetContainer.style.filter === 'none') return;
                    
                    // Tıklamayı engelle
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Bulanıklığı kaldır
                    tweetContainer.style.filter = 'none';
                    
                    // İstatistikleri güncelle
                    stats.totalBlocked++;
                    saveStats(stats);
                });
                
                // İşlendiğini belirt
                tweet.setAttribute('data-kuae-filtered', 'true');
                
                // İstatistikleri güncelle
                if (matchedKeyword && stats.blockedKeywordsDetail && !stats.blockedKeywordsDetail.includes(matchedKeyword)) {
                    stats.blockedKeywords++;
                    stats.blockedKeywordsDetail.push(matchedKeyword);
                }
                
                if (isBlockedAccount && stats.blockedAccountsDetail && !stats.blockedAccountsDetail.includes(userName)) {
                    stats.blockedAccounts++;
                    stats.blockedAccountsDetail.push(userName);
                }
                
                saveStats(stats);
            }
            // Sadece not eklenmiş hesaplar için not simgesi ekle (engellenmemiş)
            else if (hasNote && !isBlockedAccount && !tweetContainer.hasAttribute('data-kuae-note-added')) {
                // Not simgesi ekle
                const noteIcon = document.createElement('div');
                noteIcon.className = 'kuae-note-icon';
                noteIcon.innerHTML = '📝';
                
                // Not simgesi stillerini doğrudan uygula
                Object.assign(noteIcon.style, {
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(29, 161, 242, 0.9)',
                    color: 'white',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    zIndex: '999',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                });
                
                // Hover efekti
                noteIcon.addEventListener('mouseover', function() {
                    this.style.transform = 'scale(1.1)';
                    this.style.boxShadow = '0 3px 7px rgba(0, 0, 0, 0.4)';
                });
                
                noteIcon.addEventListener('mouseout', function() {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
                });
                
                // Tooltip içeriği
                const tooltipContent = `Not: ${settings.accountDetails[userName].note}`;
                noteIcon.title = tooltipContent;
                
                // Pozisyon ayarı için container'ı relative yap
                tweetContainer.style.position = 'relative';
                
                // Simgeyi ekle
                tweetContainer.appendChild(noteIcon);
                
                // Not simgesine tıklama olayı
                noteIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Not popup'ı göster
                    showNotePopup(userName, settings.accountDetails[userName].note);
                });
                
                // İşlendiğini belirt
                tweet.setAttribute('data-kuae-note-added', 'true');
            }
        });
        
        // Profil sayfalarını filtrele
        filterProfilePages();
    }
    
    // Profil sayfalarını filtreleme fonksiyonu
    function filterProfilePages() {
        const profilePage = document.querySelector('[data-testid="primaryColumn"]');
        if (profilePage) {
            // Kullanıcı adını bul
            const userNameElement = document.querySelector('a[data-testid="UserUrl"]');
            if (userNameElement) {
                const userHref = userNameElement.getAttribute('href');
                const userName = userHref.split('/').pop().toLowerCase();
                
                // Hesap kontrolü
                let isBlockedAccount = false;
                let accountCategory = null;
                
                Object.keys(settings.accountsByCategory).forEach(category => {
                    if (settings.accountsByCategory[category].includes(userName)) {
                        isBlockedAccount = true;
                        accountCategory = category;
                    }
                });
                
                // Not eklenmiş ama engellenmemiş hesapları kontrol et
                const hasNote = settings.accountDetails && settings.accountDetails[userName] && settings.accountDetails[userName].note;
                
                if (isBlockedAccount && settings.enabled && !profilePage.hasAttribute('data-kuae-filtered')) {
                    // Profil sayfasını bulanıklaştır
                    profilePage.style.filter = `blur(${settings.blurLevel}px)`;
                    profilePage.style.transition = 'filter 0.3s ease';
                    
                    // Uyarı simgesi ekle
                    const warningIcon = document.createElement('div');
                    warningIcon.className = 'kuae-warning-icon';
                    warningIcon.innerHTML = '⚠️';
                    warningIcon.style.position = 'absolute';
                    warningIcon.style.top = '10px';
                    warningIcon.style.right = '10px';
                    warningIcon.style.backgroundColor = settings.warningColor;
                    warningIcon.style.color = 'white';
                    warningIcon.style.width = '24px';
                    warningIcon.style.height = '24px';
                    warningIcon.style.borderRadius = '50%';
                    warningIcon.style.display = 'flex';
                    warningIcon.style.alignItems = 'center';
                    warningIcon.style.justifyContent = 'center';
                    warningIcon.style.fontSize = '14px';
                    warningIcon.style.fontWeight = 'bold';
                    warningIcon.style.zIndex = '2';
                    warningIcon.style.cursor = 'pointer';
                    warningIcon.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                    
                    // Tooltip içeriği
                    let tooltipContent = `${settings.warningMessage}\nHesap: @${userName}`;
                    
                    // Not varsa göster
                    if (hasNote) {
                        tooltipContent += `\nNot: ${settings.accountDetails[userName].note}`;
                    }
                    
                    warningIcon.title = tooltipContent;
                    
                    // Pozisyon ayarı için container'ı relative yap
                    profilePage.style.position = 'relative';
                    
                    // Simgeyi ekle
                    profilePage.appendChild(warningIcon);
                    
                    // Uyarı simgesine tıklama olayı
                    warningIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // Tooltip göster
                        showTooltip(warningIcon, tooltipContent);
                    });
                    
                    // Tıklama olayı ekle
                    profilePage.addEventListener('click', (e) => {
                        // Eğer profil zaten görünürse, olayı engelleme
                        if (profilePage.style.filter === 'none') return;
                        
                        // Tıklamayı engelle
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // Bulanıklığı kaldır
                        profilePage.style.filter = 'none';
                        
                        // İstatistikleri güncelle
                        stats.totalBlocked++;
                        saveStats(stats);
                    });
                    
                    // İşlendiğini belirt
                    profilePage.setAttribute('data-kuae-filtered', 'true');
                    
                    // İstatistikleri güncelle
                    if (stats.blockedAccountsDetail && !stats.blockedAccountsDetail.includes(userName)) {
                        stats.blockedAccounts++;
                        stats.blockedAccountsDetail.push(userName);
                        saveStats(stats);
                    }
                }
                // Sadece not eklenmiş hesaplar için not simgesi ekle (engellenmemiş)
                else if (hasNote && !isBlockedAccount && !profilePage.hasAttribute('data-kuae-note-added')) {
                    // Not simgesi ekle
                    const noteIcon = document.createElement('div');
                    noteIcon.className = 'kuae-note-icon';
                    noteIcon.innerHTML = '📝';
                    
                    // Not simgesi stillerini doğrudan uygula
                    Object.assign(noteIcon.style, {
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(29, 161, 242, 0.9)',
                        color: 'white',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        zIndex: '999',
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    });
                    
                    // Hover efekti
                    noteIcon.addEventListener('mouseover', function() {
                        this.style.transform = 'scale(1.1)';
                        this.style.boxShadow = '0 3px 7px rgba(0, 0, 0, 0.4)';
                    });
                    
                    noteIcon.addEventListener('mouseout', function() {
                        this.style.transform = 'scale(1)';
                        this.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
                    });
                    
                    // Tooltip içeriği
                    const tooltipContent = `Not: ${settings.accountDetails[userName].note}`;
                    noteIcon.title = tooltipContent;
                    
                    // Pozisyon ayarı için container'ı relative yap
                    profilePage.style.position = 'relative';
                    
                    // Simgeyi ekle
                    profilePage.appendChild(noteIcon);
                    
                    // Not simgesine tıklama olayı
                    noteIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // Not popup'ı göster
                        showNotePopup(userName, settings.accountDetails[userName].note);
                    });
                    
                    // İşlendiğini belirt
                    profilePage.setAttribute('data-kuae-note-added', 'true');
                }
            }
        }
    }
    
    // Bildirim göster
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.id = 'kuae-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // Ayarlar butonunu ekle
    createToggleButton();
    
    // Menü komutlarını ekle
    registerMenuCommands();
    
    // Gönderileri filtrele
    filterContent();
    
    // Tooltip göster
    function showTooltip(element, content) {
        // Varsa eski tooltip'i kaldır
        const oldTooltip = document.querySelector('.kuae-tooltip');
        if (oldTooltip) {
            oldTooltip.remove();
        }
        
        // Tooltip oluştur
        const tooltip = document.createElement('div');
        tooltip.className = 'kuae-tooltip';
        
        // Tooltip stillerini doğrudan uygula
        Object.assign(tooltip.style, {
            position: 'fixed',
            zIndex: '10000',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
            maxWidth: '450px',
            minWidth: '350px',
            fontSize: '15px',
            lineHeight: '1.6',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            pointerEvents: 'auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            border: '1px solid #444',
            transform: 'translateZ(0)'
        });
        
        // İçeriği satırlara böl
        const lines = content.split('\n');
        
        // Not başlığı container
        const headerContainer = document.createElement('div');
        headerContainer.style.borderBottom = '1px solid #444';
        headerContainer.style.marginBottom = '12px';
        headerContainer.style.paddingBottom = '10px';
        
        // Not başlığı
        if (lines.length > 0) {
            const headerElement = document.createElement('div');
            headerElement.textContent = lines[0];
            headerElement.style.fontWeight = 'bold';
            headerElement.style.fontSize = '16px';
            headerElement.style.color = '#1da1f2';
            headerContainer.appendChild(headerElement);
            tooltip.appendChild(headerContainer);
        }
        
        // Not içeriği container
        const contentContainer = document.createElement('div');
        
        // Not içeriği
        for (let i = 1; i < lines.length; i++) {
            const lineElement = document.createElement('div');
            lineElement.textContent = lines[i];
            lineElement.style.margin = '6px 0';
            contentContainer.appendChild(lineElement);
        }
        
        tooltip.appendChild(contentContainer);
        
        // Kapatma butonu ekle
        const closeButton = document.createElement('div');
        closeButton.textContent = '✕';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '12px';
        closeButton.style.right = '14px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '16px';
        closeButton.style.color = '#888';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.padding = '4px 8px';
        closeButton.style.borderRadius = '4px';
        
        closeButton.addEventListener('mouseover', function() {
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            this.style.color = '#fff';
        });
        
        closeButton.addEventListener('mouseout', function() {
            this.style.backgroundColor = 'transparent';
            this.style.color = '#888';
        });
        
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            tooltip.remove();
        });
        
        tooltip.appendChild(closeButton);
        
        // Tooltip'i sayfaya ekle
        document.body.appendChild(tooltip);
        
        // Pozisyonu hesapla
        const rect = element.getBoundingClientRect();
        
        // Tooltip boyutlarını al
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Pozisyonu hesapla - fixed positioning için viewport'a göre
        let top = rect.top - tooltipRect.height - 10;
        if (top < 0) {
            top = rect.bottom + 10;
        }
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        if (left < 10) {
            left = 10;
        } else if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        
        // Dışarı tıklama ile kapat
        document.addEventListener('click', function closeTooltip(e) {
            if (!tooltip.contains(e.target) && e.target !== element) {
                tooltip.remove();
                document.removeEventListener('click', closeTooltip);
            }
        });
    }
})();