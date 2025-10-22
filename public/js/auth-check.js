(function() {
  const publicPages = ['/login.html', '/register.html', '/public/login.html', '/public/register.html'];
  const currentPath = window.location.pathname;
  
  const isPublicPage = publicPages.some(page => 
    currentPath === page || currentPath.endsWith(page)
  );
  
  if (!isPublicPage && window.authService) {
    if (!window.authService.isAuthenticated()) {
      window.location.href = '/login.html';
    } else {
      const user = window.authService.getUser();
      if (user) {
        const userInfoElements = document.querySelectorAll('.user-info, #userInfo, [data-user-info]');
        userInfoElements.forEach(el => {
          if (el) {
            const displayName = user.fullName || user.firstName || user.username;
            el.textContent = displayName;
          }
        });

        const logoutButtons = document.querySelectorAll('.logout-btn, #logoutBtn, [data-logout]');
        logoutButtons.forEach(btn => {
          if (btn) {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              window.authService.logout();
            });
          }
        });
      }
    }
  }
})();
