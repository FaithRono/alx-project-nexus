/**
 * Gamification System for PollCraft Pro
 */

class AchievementSystem {
    constructor() {
        this.achievements = {
            'first_vote': { 
                icon: '🎯', 
                title: 'First Vote', 
                description: 'Cast your first vote!',
                xp: 10
            },
            'poll_creator': { 
                icon: '🏗️', 
                title: 'Poll Creator', 
                description: 'Create your first poll!',
                xp: 50
            },
            'viral_poll': { 
                icon: '🚀', 
                title: 'Viral Creator', 
                description: 'Your poll got 100+ votes!',
                xp: 200
            },
            'speed_voter': { 
                icon: '⚡', 
                title: 'Speed Voter', 
                description: 'Vote within 5 seconds!',
                xp: 25
            },
            'streak_master': { 
                icon: '🔥', 
                title: 'Streak Master', 
                description: '7-day voting streak!',
                xp: 100
            },
            'trend_setter': { 
                icon: '📈', 
                title: 'Trend Setter', 
                description: 'Create 3 trending polls!',
                xp: 300
            }
        };
        
        this.userProgress = this.loadProgress();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for poll creation
        document.addEventListener('pollCreated', () => {
            this.checkAndUnlock('create_poll');
        });

        // Listen for votes
        document.addEventListener('pollVoted', (event) => {
            this.checkAndUnlock('first_vote');
            if (event.detail && event.detail.time < 5000) {
                this.checkAndUnlock('fast_vote', event.detail);
            }
        });
    }

    checkAndUnlock(action, data = {}) {
        try {
            const unlockedAchievements = this.evaluateAction(action, data);
            unlockedAchievements.forEach(achievement => {
                this.showAchievementUnlock(achievement);
                this.saveAchievement(achievement);
            });
        } catch (error) {
            console.error('Error checking achievements:', error);
        }
    }

    evaluateAction(action, data) {
        const unlocked = [];
        
        try {
            switch(action) {
                case 'first_vote':
                    if (!this.hasAchievement('first_vote')) {
                        unlocked.push(this.achievements.first_vote);
                    }
                    break;
                case 'create_poll':
                    if (!this.hasAchievement('poll_creator')) {
                        unlocked.push(this.achievements.poll_creator);
                    }
                    break;
                case 'fast_vote':
                    if (data.time < 5000 && !this.hasAchievement('speed_voter')) {
                        unlocked.push(this.achievements.speed_voter);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error evaluating action:', error);
        }
        
        return unlocked;
    }

    showAchievementUnlock(achievement) {
        try {
            const notification = document.createElement('div');
            notification.className = 'achievement-unlock';
            notification.innerHTML = `
                <div class="achievement-popup animate__animated animate__bounceIn">
                    <div class="achievement-glow"></div>
                    <div class="achievement-content">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <h4>Achievement Unlocked!</h4>
                        <h5>${achievement.title}</h5>
                        <p>${achievement.description}</p>
                        <div class="xp-gained">+${achievement.xp} XP</div>
                    </div>
                    <div class="celebration-particles"></div>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Play sound effect
            this.playAchievementSound();
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('Error showing achievement:', error);
        }
    }

    playAchievementSound() {
        try {
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioContextClass();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.01);
                gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }
        } catch (error) {
            console.warn('Could not play achievement sound:', error);
        }
    }

    hasAchievement(achievementId) {
        return this.userProgress.achievements.includes(achievementId);
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('pollcraft_progress');
            return saved ? JSON.parse(saved) : {
                xp: 0,
                level: 1,
                achievements: [],
                streak: 0,
                pollsCreated: 0,
                votesGiven: 0
            };
        } catch (error) {
            console.error('Error loading progress:', error);
            return {
                xp: 0,
                level: 1,
                achievements: [],
                streak: 0,
                pollsCreated: 0,
                votesGiven: 0
            };
        }
    }

    saveAchievement(achievement) {
        try {
            if (!this.userProgress.achievements.includes(achievement.title)) {
                this.userProgress.achievements.push(achievement.title);
                this.userProgress.xp += achievement.xp;
                this.updateLevel();
                this.saveProgress();
            }
        } catch (error) {
            console.error('Error saving achievement:', error);
        }
    }

    updateLevel() {
        try {
            const newLevel = Math.floor(this.userProgress.xp / 100) + 1;
            if (newLevel > this.userProgress.level) {
                this.userProgress.level = newLevel;
                this.showLevelUp(newLevel);
            }
        } catch (error) {
            console.error('Error updating level:', error);
        }
    }

    showLevelUp(level) {
        try {
            if (typeof showAlert === 'function') {
                showAlert(`🎉 Level Up! You're now level ${level}!`, 'success', 7000);
            } else {
                console.log(`🎉 Level Up! You're now level ${level}!`);
            }
        } catch (error) {
            console.error('Error showing level up:', error);
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('pollcraft_progress', JSON.stringify(this.userProgress));
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    getCurrentProgress() {
        return this.userProgress;
    }
}

class UserProgression {
    constructor() {
        try {
            this.achievementSystem = new AchievementSystem();
        } catch (error) {
            console.error('Error initializing UserProgression:', error);
        }
    }

    addXP(action, amount = null) {
        try {
            const xpValues = {
                'vote': 10,
                'create_poll': 50,
                'poll_gets_vote': 5,
                'daily_login': 15,
                'share_poll': 25
            };

            const xpGained = amount || xpValues[action] || 0;
            this.achievementSystem.userProgress.xp += xpGained;
            this.achievementSystem.updateLevel();
            this.achievementSystem.saveProgress();
            
            this.showXPGain(xpGained);
        } catch (error) {
            console.error('Error adding XP:', error);
        }
    }

    showXPGain(xp) {
        try {
            const xpNotification = document.createElement('div');
            xpNotification.className = 'xp-gain animate__animated animate__fadeInUp';
            xpNotification.innerHTML = `+${xp} XP`;
            xpNotification.style.cssText = `
                position: fixed;
                top: 20%;
                right: 20px;
                background: linear-gradient(45deg, #ffd700, #ffed4e);
                color: #333;
                padding: 10px 20px;
                border-radius: 50px;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
            `;
            
            document.body.appendChild(xpNotification);
            setTimeout(() => {
                if (xpNotification.parentNode) {
                    xpNotification.remove();
                }
            }, 2000);
        } catch (error) {
            console.error('Error showing XP gain:', error);
        }
    }

    getCurrentProgress() {
        return this.achievementSystem ? this.achievementSystem.getCurrentProgress() : null;
    }
}

// Export for global access
window.AchievementSystem = AchievementSystem;
window.UserProgression = UserProgression;