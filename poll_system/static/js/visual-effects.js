/**
 * Visual Effects and Animations for PollCraft Pro
 */

class VisualEffects {
    constructor() {
        this.initParticleSystem();
        this.setupVoteEffects();
    }

    initParticleSystem() {
        // Create particle canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'particle-canvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
        `;
        document.body.appendChild(canvas);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    celebrateVote(element) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        // Create fireworks
        this.createFireworks(x, y);
        
        // Create confetti
        this.createConfetti(x, y);
        
        // Add ripple effect
        this.addRippleEffect(element);
    }

    createFireworks(x, y) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#ff9ff3'];
        
        for (let i = 0; i < 15; i++) {
            const particle = {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 60,
                maxLife: 60
            };
            this.particles.push(particle);
        }
        
        this.animateParticles();
    }

    createConfetti(x, y) {
        for (let i = 0; i < 20; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: hsl(${Math.random() * 360}, 100%, 50%);
                left: ${x}px;
                top: ${y}px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                animation: confetti-fall 3s ease-out forwards;
                z-index: 9999;
                transform: rotate(${Math.random() * 360}deg);
            `;
            
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }
    }

    addRippleEffect(element) {
        const ripple = document.createElement('div');
        ripple.className = 'vote-ripple';
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(79, 70, 229, 0.3);
            width: 20px;
            height: 20px;
            animation: ripple 0.6s ease-out;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    animateParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2; // gravity
            particle.life--;
            
            const alpha = particle.life / particle.maxLife;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x, particle.y, 4, 4);
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        if (this.particles.length > 0) {
            requestAnimationFrame(() => this.animateParticles());
        }
    }

    setupVoteEffects() {
        // Add click event listener for vote celebrations
        document.addEventListener('click', (e) => {
            if (e.target.closest('.voting-option')) {
                setTimeout(() => {
                    this.celebrateVote(e.target.closest('.voting-option'));
                }, 100);
            }
        });
    }
}


// Export for global access
window.VisualEffects = VisualEffects;
