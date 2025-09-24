/**
 * AI-Powered Features for PollCraft Pro
 */

class MoodAnalyzer {
    analyze(text) {
        const keywords = {
            energetic: ['exciting', 'amazing', 'awesome', 'fun', 'party', 'celebration', 'energy', 'dynamic'],
            calm: ['peaceful', 'relaxed', 'quiet', 'meditation', 'zen', 'serene', 'tranquil'],
            serious: ['business', 'professional', 'formal', 'meeting', 'corporate', 'official'],
            creative: ['art', 'design', 'creative', 'innovation', 'imagination', 'artistic']
        };

        const lowerText = text.toLowerCase();
        let scores = {};

        Object.keys(keywords).forEach(mood => {
            scores[mood] = keywords[mood].reduce((count, keyword) => {
                return count + (lowerText.includes(keyword) ? 1 : 0);
            }, 0);
        });

        // Return the mood with highest score, default to 'energetic'
        const topMood = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        return scores[topMood] > 0 ? topMood : 'energetic';
    }
}

class ColorGenerator {
    generatePalette(mood) {
        const palettes = {
            energetic: {
                primary: '#ff6b6b',
                gradients: ['#ff6b6b', '#feca57', '#ff9ff3'],
                accent: '#48dbfb'
            },
            calm: {
                primary: '#74b9ff',
                gradients: ['#74b9ff', '#0984e3', '#a29bfe'],
                accent: '#00cec9'
            },
            serious: {
                primary: '#2d3436',
                gradients: ['#2d3436', '#636e72', '#b2bec3'],
                accent: '#4f46e5'
            },
            creative: {
                primary: '#fd79a8',
                gradients: ['#fd79a8', '#fdcb6e', '#6c5ce7'],
                accent: '#55a3ff'
            }
        };

        return palettes[mood] || palettes.energetic;
    }
}

class AIThemeGenerator {
    constructor() {
        this.moodAnalyzer = new MoodAnalyzer();
        this.colorGenerator = new ColorGenerator();
    }

    async generateThemeFromPoll(pollTitle, description = '') {
        try {
            const mood = this.analyzeMood(pollTitle + ' ' + description);
            const colors = this.generateColorPalette(mood);
            const animations = this.selectAnimations(mood);
            
            return {
                mood: mood,
                primaryColor: colors.primary,
                gradients: colors.gradients,
                animations: animations,
                particles: this.generateParticles(mood)
            };
        } catch (error) {
            console.error('Error generating theme:', error);
            return this.getDefaultTheme();
        }
    }

    analyzeMood(text) {
        return this.moodAnalyzer.analyze(text);
    }

    generateColorPalette(mood) {
        return this.colorGenerator.generatePalette(mood);
    }

    selectAnimations(mood) {
        const animations = {
            energetic: ['bounce', 'pulse', 'shake'],
            calm: ['fadeIn', 'slideInUp', 'zoomIn'],
            serious: ['fadeInDown', 'slideInLeft'],
            creative: ['rotateIn', 'flipInX', 'bounceInDown']
        };

        return animations[mood] || animations.energetic;
    }

    generateParticles(mood) {
        const particleConfigs = {
            energetic: {
                particles: {
                    number: { value: 80 },
                    color: { value: ['#ff6b6b', '#feca57', '#ff9ff3'] },
                    shape: { type: 'circle' },
                    opacity: { value: 0.5 },
                    size: { value: 4 },
                    move: { enable: true, speed: 3 }
                }
            },
            calm: {
                particles: {
                    number: { value: 30 },
                    color: { value: '#74b9ff' },
                    shape: { type: 'circle' },
                    opacity: { value: 0.3 },
                    size: { value: 2 },
                    move: { enable: true, speed: 1 }
                }
            },
            serious: {
                particles: {
                    number: { value: 20 },
                    color: { value: '#636e72' },
                    shape: { type: 'polygon' },
                    opacity: { value: 0.2 },
                    size: { value: 3 },
                    move: { enable: true, speed: 0.5 }
                }
            },
            creative: {
                particles: {
                    number: { value: 60 },
                    color: { value: ['#fd79a8', '#fdcb6e', '#6c5ce7'] },
                    shape: { type: 'star' },
                    opacity: { value: 0.4 },
                    size: { value: 5 },
                    move: { enable: true, speed: 2 }
                }
            }
        };

        return particleConfigs[mood] || particleConfigs.energetic;
    }

    applyTheme(theme) {
        try {
            // Apply CSS custom properties
            document.documentElement.style.setProperty('--ai-primary', theme.primaryColor);
            document.documentElement.style.setProperty('--ai-gradient-1', theme.gradients[0]);
            document.documentElement.style.setProperty('--ai-gradient-2', theme.gradients[1]);
            document.documentElement.style.setProperty('--ai-gradient-3', theme.gradients[2]);
            
            // Apply particles if available
            this.initParticles(theme.particles);
            
            // Show theme applied notification
            this.showThemeNotification(theme.mood);
            
        } catch (error) {
            console.error('Error applying theme:', error);
        }
    }

    initParticles(particleConfig) {
        try {
            if (typeof particlesJS !== 'undefined') {
                particlesJS('particles-js', particleConfig);
            }
        } catch (error) {
            console.warn('Particles.js not available:', error);
        }
    }

    showThemeNotification(mood) {
        const notification = document.createElement('div');
        notification.className = 'theme-notification animate__animated animate__fadeInDown';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-palette me-2"></i>
                <span>AI Theme Applied: ${mood.charAt(0).toUpperCase() + mood.slice(1)}</span>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('animate__fadeOutUp');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    getDefaultTheme() {
        return {
            mood: 'energetic',
            primaryColor: '#4f46e5',
            gradients: ['#4f46e5', '#3730a3', '#1e40af'],
            animations: ['fadeIn'],
            particles: {
                particles: {
                    number: { value: 50 },
                    color: { value: '#ffffff' },
                    opacity: { value: 0.1 },
                    size: { value: 3 },
                    move: { enable: true, speed: 1 }
                }
            }
        };
    }
}

class AIAssistant {
    async suggestPollImprovements(pollData) {
        try {
            return {
                titleSuggestions: this.generateBetterTitles(pollData.title),
                optionSuggestions: this.suggestAdditionalOptions(pollData.options),
                targetAudience: this.identifyBestAudience(pollData),
                bestTimeToPost: this.predictOptimalTiming(pollData),
                viralPotential: this.calculateViralScore(pollData)
            };
        } catch (error) {
            console.error('Error generating suggestions:', error);
            return this.getDefaultSuggestions();
        }
    }

    generateBetterTitles(originalTitle) {
        if (!originalTitle) return ['What do you think?', 'Quick poll:', 'Your opinion matters:'];
        
        const templates = [
            `🤔 ${originalTitle}`,
            `What's your take: ${originalTitle}`,
            `Quick poll: ${originalTitle}`,
            `Help us decide: ${originalTitle}`,
            `Your opinion matters: ${originalTitle}`
        ];
        return templates.slice(0, 3);
    }

    suggestAdditionalOptions(options) {
        const suggestions = ['Other', 'Not sure', 'Need more info', 'All of the above', 'None of the above'];
        return suggestions.slice(0, 2);
    }

    identifyBestAudience(pollData) {
        // Simple audience identification based on content
        const categories = {
            'business': ['Business professionals', 'Entrepreneurs'],
            'technology': ['Tech enthusiasts', 'Developers'],
            'entertainment': ['General public', 'Entertainment fans'],
            'education': ['Students', 'Educators']
        };
        
        return categories[pollData.category] || ['General audience', 'Social media users'];
    }

    predictOptimalTiming(pollData) {
        // Mock optimal timing prediction
        const times = [
            'Weekday mornings (9-11 AM)',
            'Lunch hours (12-2 PM)',
            'Evening hours (6-8 PM)',
            'Weekend afternoons (2-4 PM)'
        ];
        
        return times[Math.floor(Math.random() * times.length)];
    }

    calculateViralScore(pollData) {
        let score = 50; // Base score
        
        try {
            // Title factors
            if (pollData.title && pollData.title.length > 10 && pollData.title.length < 60) score += 10;
            if (pollData.title && pollData.title.includes('?')) score += 5;
            
            // Option factors
            if (pollData.options && pollData.options.length >= 3) score += 10;
            if (pollData.options && pollData.options.length <= 5) score += 5;
            
            // Category bonus
            if (pollData.category) score += 5;
            
            // Description bonus
            if (pollData.description && pollData.description.length > 20) score += 5;
            
            // Randomize for demo
            score += Math.floor(Math.random() * 20);
            
            return Math.min(score, 95);
        } catch (error) {
            console.error('Error calculating viral score:', error);
            return 50;
        }
    }

    renderAISuggestions(suggestions) {
        return `
            <div class="ai-assistant-panel">
                <div class="ai-avatar">🤖</div>
                <h6>AI Assistant Suggestions</h6>
                
                <div class="suggestion-card">
                    <h7>💡 Title Improvements</h7>
                    ${suggestions.titleSuggestions.map(title => `
                        <div class="suggestion-item" onclick="this.applyTitleSuggestion('${title}')">
                            ${title} <span class="viral-score">+${Math.floor(Math.random() * 50)}% engagement</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="suggestion-card">
                    <h7>🎯 Viral Potential: ${suggestions.viralPotential}%</h7>
                    <div class="viral-meter">
                        <div class="viral-fill" style="width: ${suggestions.viralPotential}%"></div>
                    </div>
                </div>
                
                <div class="suggestion-card">
                    <h7>⏰ Best Time to Post</h7>
                    <p class="small">${suggestions.bestTimeToPost}</p>
                </div>
            </div>
        `;
    }

    applyTitleSuggestion(title) {
        const titleInput = document.getElementById('poll-title');
        if (titleInput) {
            titleInput.value = title;
            titleInput.focus();
        }
    }

    getDefaultSuggestions() {
        return {
            titleSuggestions: ['What do you think?', 'Quick poll:', 'Your opinion matters:'],
            optionSuggestions: ['Other', 'Not sure'],
            targetAudience: ['General audience'],
            bestTimeToPost: 'Weekday mornings (9-11 AM)',
            viralPotential: 50
        };
    }
}

// Auto-generate theme when poll is created or viewed
class AutoThemeApplier {
    static applyToCurrentPoll() {
        try {
            const pollTitle = document.getElementById('poll-title')?.value;
            const pollDescription = document.getElementById('poll-description')?.value;
            
            if (pollTitle && window.aiThemeGenerator) {
                window.aiThemeGenerator.generateThemeFromPoll(pollTitle, pollDescription)
                    .then(theme => {
                        window.aiThemeGenerator.applyTheme(theme);
                    });
            }
        } catch (error) {
            console.error('Error auto-applying theme:', error);
        }
    }
}

// Export for global access
window.AIThemeGenerator = AIThemeGenerator;
window.AIAssistant = AIAssistant;
window.AutoThemeApplier = AutoThemeApplier;