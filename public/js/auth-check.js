(function() {
  const publicPages = ['/login.html', '/register.html', '/public/login.html', '/public/register.html'];
  const currentPath = window.location.pathname;
  const isPublicPage = publicPages.some(page => currentPath === page || currentPath.endsWith(page));

  if (!window.authService) {
    return;
  }

  const updateUserInterface = (user) => {
    if (!user) {
      return;
    }

    const displayName = user.fullName || user.firstName || user.username || user.email || 'User';
    const firstName = user.firstName || displayName.split(' ')[0];
    const roleLabel = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member';
    const avatarUrl = user.profilePicture || user.profile?.avatar;
    const initials = displayName.charAt(0).toUpperCase();

    const displayNameTargets = document.querySelectorAll('.sidebar__user-name, [data-user-display-name]');
    displayNameTargets.forEach((el) => {
      el.textContent = displayName;
    });

    const firstNameTargets = document.querySelectorAll('[data-user-first-name]');
    firstNameTargets.forEach((el) => {
      el.textContent = firstName;
    });

    const roleTargets = document.querySelectorAll('.sidebar__user-role, [data-user-role]');
    roleTargets.forEach((el) => {
      el.textContent = roleLabel;
    });

    const avatarTargets = document.querySelectorAll('[data-user-avatar]');
    avatarTargets.forEach((el) => {
      if (avatarUrl) {
        let img = el.querySelector('img');
        if (!img) {
          el.innerHTML = '';
          img = document.createElement('img');
          img.referrerPolicy = 'no-referrer';
          el.appendChild(img);
        }
        img.src = avatarUrl;
        img.alt = `${displayName}'s avatar`;
        el.classList.add('has-image');
      } else {
        el.classList.remove('has-image');
        el.innerHTML = `<span aria-hidden="true">${initials}</span>`;
      }
    });
  };

  const registerLogoutHandlers = () => {
    const logoutButtons = document.querySelectorAll('.logout-btn, #logoutBtn, [data-logout]');
    logoutButtons.forEach((btn) => {
      if (!btn.dataset.boundLogout) {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          window.authService.logout();
        });
        btn.dataset.boundLogout = 'true';
      }
    });
  };

  const refreshUserData = async () => {
    try {
      const response = await window.authService.getCurrentUser();
      if (response?.data) {
        updateUserInterface(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh user details:', error);
    }
  };

  if (!isPublicPage) {
    if (!window.authService.isAuthenticated()) {
      window.location.href = '/login.html';
      return;
    }

    const cachedUser = window.authService.getUser();
    if (cachedUser) {
      updateUserInterface(cachedUser);
    } else {
      refreshUserData();
    }

    registerLogoutHandlers();
  }

  window.addEventListener('oauth:success', () => {
    refreshUserData();
  });
})();
