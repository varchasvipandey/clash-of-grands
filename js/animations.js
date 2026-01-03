// Animation utilities
class Animations {
  static flipCoin(coinElement, result) {
    coinElement.classList.add('flipping');
    
    setTimeout(() => {
      coinElement.classList.remove('flipping');
      // Set final rotation based on result
      const rotations = result === 'heads' ? 1800 : 1980; // 1980 = 1800 + 180 for tails
      coinElement.style.transform = `rotateY(${rotations}deg)`;
    }, 3000);
  }

  static rollDice(pasaElement) {
    pasaElement.style.animation = 'none';
    setTimeout(() => {
      pasaElement.style.animation = 'spin 0.5s ease-out';
    }, 10);
  }

  static selectPasa(pasaElement) {
    pasaElement.classList.add('selected');
  }

  static deselectPasa(pasaElement) {
    pasaElement.classList.remove('selected');
  }

  static showPhaseAnnouncement(phaseElement, message, duration = 2000) {
    phaseElement.classList.add('show');
    
    setTimeout(() => {
      phaseElement.classList.remove('show');
    }, duration);
  }

  static attackAnimation(pasaElement) {
    pasaElement.classList.add('attacking');
    setTimeout(() => {
      pasaElement.classList.remove('attacking');
    }, 500);
  }

  static damageAnimation(targetElement) {
    targetElement.classList.add('damaged');
    setTimeout(() => {
      targetElement.classList.remove('damaged');
    }, 500);
  }

  static fadeOut(element, callback) {
    element.style.transition = 'opacity 0.5s';
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.display = 'none';
      element.style.opacity = '1';
      if (callback) callback();
    }, 500);
  }

  static fadeIn(element) {
    element.style.display = 'block';
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.transition = 'opacity 0.5s';
      element.style.opacity = '1';
    }, 10);
  }

  static updateCounter(element, newValue, oldValue) {
    // Animate number change
    const diff = newValue - oldValue;
    if (diff !== 0) {
      element.style.transform = 'scale(1.3)';
      element.style.color = diff > 0 ? '#4CAF50' : '#f44336';
      
      setTimeout(() => {
        element.textContent = newValue;
        setTimeout(() => {
          element.style.transform = 'scale(1)';
          element.style.color = '';
        }, 200);
      }, 100);
    } else {
      element.textContent = newValue;
    }
  }

  static movePasaToWarZone(pasaElement, targetZone) {
    const clone = pasaElement.cloneNode(true);
    clone.classList.add('pasa-small');
    targetZone.appendChild(clone);
    
    // Fade out original
    this.fadeOut(pasaElement);
  }

  static clearWarZone(zoneElement) {
    while (zoneElement.firstChild) {
      zoneElement.removeChild(zoneElement.firstChild);
    }
  }
}

window.Animations = Animations;
