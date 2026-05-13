document.addEventListener('DOMContentLoaded', () => {
    // Check if on login page and already authenticated
    const token = sessionStorage.getItem('c3_auth_token');
    if (token && window.location.pathname.includes('index.html')) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Mock authentication
            if (username === 'c3' && password === '123') {
                // Generate a simple mock token
                const mockToken = btoa(username + ':' + Date.now());
                sessionStorage.setItem('c3_auth_token', mockToken);
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                loginError.classList.remove('hidden');
                setTimeout(() => {
                    loginError.classList.add('hidden');
                }, 3000);
            }
        });
    }
});
