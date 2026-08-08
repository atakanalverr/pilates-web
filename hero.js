// Hero: yavaş zoom-out arka plan + karakter karakter beliren başlık + dönen özellik etiketi
// (Core Atelier Pilates'teki mekanizmadan esinlenildi: gsap.to scale, SplitType char reveal, sonsuz döngü carousel)

(function () {
  const hasGsap = typeof gsap !== "undefined";
  const hasSplitType = typeof SplitType !== "undefined";

  // 1) Arka plan: fotoğraflar saydamlıkla (opacity) ve hafif zoom ile birbirinin üstüne geçiş yapıyor
  const slides = Array.from(document.querySelectorAll(".hero-slide"));
  if (slides.length > 0) {
    let current = 0;

    // İlk fotoğrafı da CSS transition'ı tetikleyecek şekilde JS ile aktifleştiriyoruz
    // (sayfa yüklenirken class doğrudan HTML'de olsaydı animasyon oynamazdı)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        slides[0].classList.add("is-active");
      });
    });

    if (slides.length > 1) {
      setInterval(() => {
        const next = (current + 1) % slides.length;
        slides[current].classList.remove("is-active");
        slides[next].classList.add("is-active");
        current = next;
      }, 4500);
    }
  }

  // 2) Başlık: harflere bölünüp ortadan dışa doğru aşağıdan yukarı beliriyor
  const heading = document.querySelector(".animated-heading");
  if (heading && hasGsap && hasSplitType) {
    const split = new SplitType(heading, { types: "lines, words, chars" });
    split.lines.forEach((line) => {
      const letters = Array.from(line.querySelectorAll(".char"));
      const middle = Math.floor(letters.length / 2);
      const ordered = [letters[middle]].filter(Boolean);
      for (let i = 1; i <= middle; i++) {
        if (letters[middle + i]) ordered.push(letters[middle + i]);
        if (letters[middle - i]) ordered.push(letters[middle - i]);
      }
      gsap.from(ordered, { y: "105%", duration: 0.75, stagger: 0.04, ease: "power2.out" });
    });
  }

  // 3) Dönen özellik etiketi: sıradaki kelime aşağıdan yukarı kayarak devreye giriyor
  const track = document.getElementById("heroFeaturesTrack");
  if (track) {
    const items = Array.from(track.children);
    if (items.length > 1) {
      let current = 0;
      items[0].classList.add("is-current");

      function showNext() {
        const next = (current + 1) % items.length;
        const currentEl = items[current];
        const nextEl = items[next];

        if (hasGsap) {
          gsap.to(currentEl, {
            yPercent: -120,
            duration: 0.6,
            ease: "power2.in",
            onComplete: () => {
              currentEl.classList.remove("is-current");
              currentEl.style.top = "100%";
              gsap.set(currentEl, { yPercent: 0 });
            },
          });
          gsap.fromTo(
            nextEl,
            { top: "100%", yPercent: 0 },
            {
              top: "50%",
              yPercent: -50,
              duration: 0.6,
              ease: "power2.out",
              onStart: () => nextEl.classList.add("is-current"),
            }
          );
        } else {
          currentEl.classList.remove("is-current");
          nextEl.classList.add("is-current");
        }

        current = next;
        setTimeout(showNext, 2400);
      }

      setTimeout(showNext, 2400);
    }
  }
})();
