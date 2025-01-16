
    const isIpadOS = () => {
      return navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 2 &&
        /MacIntel/.test(navigator.platform);
    }

    if (isIpadOS()) {
      document.addEventListener("touchstart", touch2Mouse, true);
      document.addEventListener("touchmove", touch2Mouse, true);
      document.addEventListener("touchend", touch2Mouse, true);
    }

    function touch2Mouse(e) {
      // Thanks to: https://www.codicode.com/art/easy_way_to_add_touch_support_to_your_website.aspx
      const theTouch = e.changedTouches[0];
      let mouseEv;

      switch (e.type) {
        case "touchstart":
          mouseEv = "mousedown";
          break;
        case "touchend":
          mouseEv = "mouseup";
          break;
        case "touchmove":
          mouseEv = "mousemove";
          break;
        default:
          return;
      }

      const mouseEvent = document.createEvent("MouseEvent");
      mouseEvent.initMouseEvent(
        mouseEv,
        true,
        true,
        window,
        1,
        theTouch.screenX,
        theTouch.screenY,
        theTouch.clientX,
        theTouch.clientY,
        false,
        false,
        false,
        false,
        0,
        null
      );
      theTouch.target.dispatchEvent(mouseEvent);

      e.preventDefault();
    }

    dragElement(document.getElementById('separator'));

    function dragElement(el) {
      el.onmousedown = null;
      let posX = 0, posY = 0, posX1 = 0, posY1 = 0;
      // const separator = document.getElementById('separator');
      const prev = el.previousElementSibling;
      const next = el.nextElementSibling;
      const container = el.parentElement;
      // let resizeCounter = 0;
      const sepThickness = parseInt(window.getComputedStyle(document.documentElement).getPropertyValue('--sep-width'));
      const matchMedia = '(min-width: 600px)';
      const maxCompress = 50;
      el.onmousedown = dragMouseDown;
      // ## necessary to update container size if window is resized
      window.onresize = elementDrag;

      // let prevState = window.matchMedia(matchMedia);
      // console.log("dragElement initiated...", prev.id, next.id)

      function dragMouseDown(e) {
        e.preventDefault();
        // get the mouse cursor position at startup:
        posX1 = e.clientX;
        posY1 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
      }

      function elementDrag(e) {
        // ## originally used flex but > problems with earlier browsers; switched to style sizings
        // ## used onresize event to update window resizings to make this work smoothly
        e.preventDefault();
        // console.log("container width/height: ",container.offsetWidth,container.offsetHeight)
        // ## calculate the new cursor position:
        posX = posX1 - e.clientX;
        posY = posY1 - e.clientY;
        posX1 = e.clientX;
        posY1 = e.clientY;
        // set the element's new position:
        const minWidth600px = window.matchMedia(matchMedia)
        if (minWidth600px.matches) {
          // ## wide window
          prev.style.height = "100%";
          next.style.height = "100%";
          const leftWidth = prev.offsetWidth - posX;
          const rightWidth = container.offsetWidth - leftWidth - sepThickness;
          if (leftWidth > maxCompress && rightWidth > maxCompress) {
            // prev.style.flex = "0 0 " + (leftWidth / container.offsetWidth) * 100 + '%';
            // next.style.flex = "0 0 " + (rightWidth / container.offsetWidth) * 100 + '%';
            prev.style.width = (leftWidth / container.offsetWidth) * 100 + '%';
            next.style.width = (rightWidth / container.offsetWidth) * 100 + '%';
          }
        }
        else {
          // ## narrow window
          prev.style.width = "100%";
          next.style.width = "100%";
          const topHeight = prev.offsetHeight - posY;
          const botHeight = container.offsetHeight - topHeight - sepThickness;
          if (topHeight > maxCompress && botHeight > maxCompress) {
            // prev.style.flex = "0 0 " + (topHeight / container.offsetHeight) * 100 + '%';
            // next.style.flex = "0 0 " + (botHeight / container.offsetHeight) * 100 + '%';
            prev.style.height = (topHeight / container.offsetHeight) * 100 + '%';
            next.style.height = (botHeight / container.offsetHeight) * 100 + '%';
          }
        }
      }

      function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }
