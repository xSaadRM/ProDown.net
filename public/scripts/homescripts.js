document.addEventListener("DOMContentLoaded", () => {
  const slideshowContainer = document.querySelector(".slideshow-container");
  const mobileNavBar = document.getElementById("mobile-navbar");
  const bartgl = document.getElementById("barToggle");
  const navBarCloser = document.getElementById("navBarCloser");
  const toastTxt1 = document.getElementById("toast-txt1");
  const toastTxt2 = document.getElementById("toast-txt2");
  const toast = document.querySelector(".toast");
  const closeIcon = document.querySelector(".close");
  const progress = document.querySelector(".progress");
  const overlay = document.querySelector(".overlay");
  let toastTimer1, toastTimer2;
  //NavBar
  bartgl.addEventListener("click", () => {
    mobileNavBar.classList.toggle("active");
    navBarCloser.classList.remove("hide");
  });
  navBarCloser.addEventListener("click", () => {
    mobileNavBar.classList.remove("active");
    navBarCloser.classList.add("hide");
  });

  const openToast = () => {
    overlay.style.display = "block";
    toast.classList.add("active");
    progress.classList.add("active");

    toastTimer1 = setTimeout(() => {
      toast.classList.remove("active");
      overlay.style.display = "none";
    }, 5000);

    toastTimer2 = setTimeout(() => {
      progress.classList.remove("active");
    }, 5300);
  };

  closeIcon.addEventListener("click", () => {
    toast.classList.remove("active");

    setTimeout(() => {
      progress.classList.remove("active");
      overlay.style.display = "none";
    }, 300);

    clearTimeout(toastTimer1);
    clearTimeout(toastTimer2);
  });

  const darkModeToggle = document.getElementById("darkModeToggle");
  const body = document.body;

  const toggleDarkMode = () => {
    body.classList.toggle("dark-mode");
    const isDarkModeEnabled = body.classList.contains("dark-mode");
    localStorage.setItem("darkModePreference", isDarkModeEnabled);
  };

  const savedDarkModePreference = localStorage.getItem("darkModePreference");
  const hasVisitedBefore = localStorage.getItem("firstTimeVisit");
  if (savedDarkModePreference === "true") {
    body.classList.add("dark-mode");
    darkModeToggle.checked = true;
  } else if (!hasVisitedBefore) {
    toastTxt1.innerHTML = "huh Light Theme?";
    toastTxt2.innerHTML =
      "Please turn on dark-mode from the website for your mental health 🙏🏿";
    openToast();
    localStorage.setItem("firstTimeVisit", false);
  }

  darkModeToggle.addEventListener("click", toggleDarkMode);

  const menuToggle = document.querySelector(".menu-toggle");
  const leftMenu = document.querySelector(".history-menu");

  const closeMenu = () => {
    leftMenu.classList.remove("active");
  };

  const handleClickOutsideMenu = (event) => {
    if (
      !leftMenu.contains(event.target) &&
      !menuToggle.contains(event.target) &&
      !darkModeToggle.contains(event.target)
    ) {
      closeMenu();
    }
  };

  menuToggle.addEventListener("click", () => {
    mobileNavBar.classList.remove("active");
    leftMenu.classList.toggle("active");
    renderVideoHistory();
  });

  document.addEventListener("click", handleClickOutsideMenu);

  window.addEventListener("scroll", () => {
    if (leftMenu.classList.contains("active")) {
      closeMenu();
    }
  });
  const thumbnailContainer = document.querySelector(".thumbnail-container");
  const videoThumbnailElem = document.getElementById("videoThumbnail");
  const form = document.querySelector("form");
  const videoInfo = document.getElementById("videoInfo");
  const videoTitleElem = document.getElementById("videoTitle");
  const authorElem = document.getElementById("vidAuthor");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const formatsBtnsElm = document.getElementById("formatsBtns");

  form.addEventListener("submit", handleFormSubmission);

  async function handleFormSubmission(event) {
    event.preventDefault();
    const inputUrl = document.getElementById("urlInput").value;

    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.*/i;
    const tiktokRegex = /^(https?:\/\/)?(www\.|vm\.)?tiktok\.com\/.*/i;
    const facebookRegex = /^(https?:\/\/)?(m\.)?(www\.)?facebook|fb\.com\/.*/i;

    let urlType = "";
    if (youtubeRegex.test(inputUrl)) {
      urlType = "youtube";
    } else if (tiktokRegex.test(inputUrl)) {
      urlType = "tiktok";
    } else if (facebookRegex.test(inputUrl)) {
      urlType = "facebook";
    } else {
      toastTxt1.innerHTML = "Invalid Link";
      toastTxt2.innerHTML = "Please enter a supported link.";
      openToast();
      return;
    }

    try {
      overlay.style.display = "block";
      loadingIndicator.style.display = "block";
      videoInfo.style.display = "none";
      videoTitleElem.innerHTML = "";
      formatsBtnsElm.innerHTML = "";
      authorElem.innerHTML = "";
      slideshowContainer.innerHTML = "";

      if (urlType === "youtube") {
        await handleYouTubeVideo(inputUrl);
      } else if (urlType === "tiktok") {
        await handleTikTokVideo(inputUrl);
      } else if (urlType === "facebook") {
        await handleFacebookVideo(inputUrl);
      }
    } catch (error) {
      console.error("Error:", error);
      toastTxt1.innerHTML = urlType;
      toastTxt2.innerHTML = `${error.message || error}`;
      openToast();
    } finally {
      loadingIndicator.style.display = "none";
      if (toast.classList.contains("active")) {
        overlay.style.display = "block";
      } else {
        overlay.style.display = "none";
      }
    }
  }

  async function handleYouTubeVideo(inputUrl) {
    const response = await fetch(`/ytinfo?ytUrl=${inputUrl}`);
    if (!response.ok) {
      const responseData = await response.text();
      if (responseData.includes("Video unavailable")) {
        throw new Error("YouTube video is unavailable");
      } else {
        throw new Error(
          `Failed to fetch YouTube video info. Status: ${response.status}`
        );
      }
    }

    const data = await response.json();

    if (data.videoDetails) {
      const { title, thumbnail, qualities, audio, author } = data.videoDetails;
      videoTitleElem.textContent = title;
      videoThumbnailElem.src = thumbnail;
      videoThumbnailElem.style.display = "flex";
      videoInfo.style.display = "flex";
      handleThumbnailAspectRatio(data.videoDetails.thumbnail);

      createFormatButtons(qualities, "video/mp4", qualities.url);
      createFormatButtons(audio, "audio", audio.url);

      authorElem.textContent = `Author: ${author.user}`;
      videoInfo.appendChild(authorElem);

      const videoDetails = {
        title: title,
        url: inputUrl,
        thumbnail: thumbnail,
      };

      updateVideoHistory(videoDetails);
    }
  }

  async function handleTikTokVideo(inputUrl) {
    const response = await fetch(`/tikinfo?tikUrl=${inputUrl}`);
    if (!response.ok) {
      const responseData = await response.text();
      if (responseData.includes("Make sure your tiktok url is correct!")) {
        throw new Error(
          `TikTok video is unavailable.\n Make sure your tiktok url is correct!`
        );
      } else {
        throw new Error(
          `Failed to fetch TikTok video info. Status: ${response.status}`
        );
      }
    }

    const data = await response.json();

    if (data) {
      const { title, thumbnail, thumbnail64, sd, hd, audio, author, images } =
        data;

      if (!thumbnail && images) {
        videoThumbnailElem.style.display = "none";
        images.forEach((slideimage) => {
          const slideshow = document.createElement("div");
          slideshowContainer.appendChild(slideshow);
          slideshowContainer.style.display = "flex";
          slideshow.classList.add("slideshow");
          const slideImageElm = document.createElement("img");
          slideImageElm.setAttribute("src", slideimage);
          slideshow.appendChild(slideImageElm);
          slideImageElm.classList.add("slide-image");
          const slideDownloadButton = document.createElement("button");
          const iconElement = document.createElement("i");
          iconElement.className = "fi fi-sr-add-image";
          slideDownloadButton.appendChild(iconElement);
          slideshow.appendChild(slideDownloadButton);
          slideDownloadButton.addEventListener("click", () => {
            slideDownloadButton.classList.add("active");
            downloadImage(slideimage, title);
            setTimeout(() => {
              slideDownloadButton.classList.remove("active");
            }, 3000); // 3000 milliseconds = 3 seconds
          });
        });
        const allSlideImageClass = document.querySelectorAll(".slide-image");
        console.log("Number of images:", allSlideImageClass.length);
        const slideDownloadAllButton = document.createElement("button");
        slideDownloadAllButton.textContent = "Download All";
        formatsBtnsElm.appendChild(slideDownloadAllButton);
        slideDownloadAllButton.classList.add("singleInfoButtons");
        slideDownloadAllButton.addEventListener("click", () => {
          images.forEach((image) => {
            downloadImage(image, title);
          });
        });
      } else if (thumbnail) {
        videoThumbnailElem.src = thumbnail;
        videoThumbnailElem.style.display = "flex";
        handleThumbnailAspectRatio(data.thumbnail);
      }

      videoTitleElem.textContent = title;
      videoInfo.style.display = "flex";

      if (sd) {
        createDownloadButton("Download SD<br>720p", sd, "mp4", "720p");
      }

      if (hd) {
        createDownloadButton("Download HD<br>1080p", hd, "mp4", "1080p");
      }

      if (audio) {
        createDownloadButton("Download MP3<br>audio", audio, "mp3", "audio");
      }

      if (author) {
        authorElem.textContent = `Author: ${author}`;
        videoInfo.appendChild(authorElem);
      }
      const videoDetails = {
        title: title,
        url: inputUrl,
        thumbnail: thumbnail64,
      };
      updateVideoHistory(videoDetails);
    }
  }

  async function handleFacebookVideo(inputUrl) {
    const response = await fetch(`/fbinfo?fbUrl=${inputUrl}`);
    if (!response.ok) {
      const responseData = await response.text();
      if (responseData.includes("Video unavailable")) {
        throw new Error("YouTube video is unavailable");
      } else {
        throw new Error(
          `Failed to fetch YouTube video info. Status: ${response.status}`
        );
      }
    }
    const data = await response.json();
    if (data) {
      const { title, thumbnail, sd, hd, audio, author } = data;
      videoTitleElem.innerHTML = title;
      videoThumbnailElem.src = thumbnail;
      videoThumbnailElem.style.display = "flex";
      videoInfo.style.display = "flex";
      handleThumbnailAspectRatio(data.thumbnail);

      if (sd) {
        createDownloadButton("Download SD", sd, "mp4", "sd");
      }

      if (hd) {
        createDownloadButton("Download HD", hd, "mp4", "hd");
      }

      if (audio) {
        createDownloadButton("Download MP3", audio, "mp3", "audio");
      }

      if (author) {
        authorElem.textContent = `Author: ${author}`;
        videoInfo.appendChild(authorElem);
      }

      const videoDetails = {
        title: title,
        url: inputUrl,
        thumbnail: thumbnail,
      };

      updateVideoHistory(videoDetails);
    } else {
      throw new Error("No data received from the server");
    }
  }

  function createFormatButtons(formats, type, url) {
    formats.forEach((format) => {
      const formatButton = document.createElement("button");
      formatButton.innerHTML = `${
        format.quality || format.bitrate
      } - ${type} <br> <span>${format.fileSize}</span>`;
      formatButton.addEventListener("click", () => {
        console.log(url);
        console.log(format.url);
        window.open(format.url);
      });
      formatsBtnsElm.appendChild(formatButton);
      formatButton.classList.add("singleInfoButtons");
    });
  }

  function createDownloadButton(label, url) {
    const formatButton = document.createElement("button");
    formatButton.innerHTML = `${label}`;
    formatButton.addEventListener("click", () => {
      window.open(`/vdl/${url}`);
    });
    formatsBtnsElm.appendChild(formatButton);
    formatButton.classList.add("singleInfoButtons");
  }

  // Function to update video history in IndexedDB
  async function updateVideoHistory(videoDetails) {
    const db = await openDB();
    const transaction = db.transaction("videoHistory", "readwrite");
    const objectStore = transaction.objectStore("videoHistory");

    return new Promise((resolve, reject) => {
      // Check if the video already exists in the history
      const existingVideoRequest = objectStore.get(videoDetails.url);

      existingVideoRequest.onsuccess = (event) => {
        const existingVideo = event.target.result;

        if (existingVideo) {
          // Update the existing video's order
          existingVideo.order = Date.now();
          const updateRequest = objectStore.put(existingVideo);

          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          // Add the new video to the history with the current timestamp as order
          const maxHistoryItems = 10;

          const countRequest = objectStore.count();
          countRequest.onsuccess = (countEvent) => {
            const count = countEvent.target.result;

            if (count >= maxHistoryItems) {
              // Fetch all videos to find the oldest one
              const index = objectStore.index("order");
              const allVideosRequest = index.getAll();

              allVideosRequest.onsuccess = (allVideosEvent) => {
                const allVideos = allVideosEvent.target.result;

                // Find the oldest video
                const oldestVideo = allVideos.reduce((oldest, current) => {
                  return current.order < oldest.order ? current : oldest;
                }, allVideos[0]);

                // Remove the oldest video
                objectStore.delete(oldestVideo.url);
              };
            }

            // Add the new video to the history
            videoDetails.order = Date.now();
            const addRequest = objectStore.add(videoDetails);

            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error);
          };
        }
      };

      existingVideoRequest.onerror = () => reject(existingVideoRequest.error);
    });
  }

  // Function to download the image
  function downloadImage(base64String, filename) {
    const blob = base64ToBlob(base64String);
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename || "image"}.jpg`; // You can customize the filename here
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Function to convert base64 to Blob
  function base64ToBlob(base64String) {
    const parts = base64String.split(";base64,");
    const contentType = parts[0].split(":")[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uint8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uint8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uint8Array], { type: contentType });
  }
  // Function to render video history in the history menu
  async function renderVideoHistory() {
    const db = await openDB();
    const historyMenu = document.querySelector(".history-menu ul");
    historyMenu.innerHTML = "";

    const objectStore = db
      .transaction("videoHistory", "readonly")
      .objectStore("videoHistory");
    const index = objectStore.index("order");

    index.openCursor(null, "prev").onsuccess = (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const video = cursor.value;

        const listItem = document.createElement("li");
        const anchor = document.createElement("a");
        const thumbnailImg = document.createElement("img");

        thumbnailImg.src = video.thumbnail;
        thumbnailImg.alt = "Thumbnail";
        anchor.href = video.url;
        anchor.textContent = video.title;

        listItem.appendChild(thumbnailImg);
        listItem.appendChild(anchor);

        historyMenu.appendChild(listItem);

        cursor.continue();
      }
    };
  }

  // Function to open IndexedDB database
  async function openDB() {
    return new Promise((resolve, reject) => {
      const openDBRequest = indexedDB.open("VideoHistoryDB_V1", 2);

      openDBRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        const objectStore = db.createObjectStore("videoHistory", {
          keyPath: "url",
        });
        objectStore.createIndex("order", "order", { unique: false });
      };

      openDBRequest.onsuccess = (event) => {
        resolve(event.target.result);
      };

      openDBRequest.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async function handleThumbnailAspectRatio(thumbnailUrl) {
    // Create a new Image element
    const thumbnailImage = new Image();

    // Set the source URL of the image
    thumbnailImage.src = thumbnailUrl;

    // Wait for the image to load
    await new Promise((resolve) => {
      thumbnailImage.onload = resolve;
    });

    // Check the aspect ratio after the image has loaded
    const aspectRatio = thumbnailImage.width / thumbnailImage.height;

    console.log("Aspect Ratio:", aspectRatio);

    if (aspectRatio > 1.5) {
      thumbnailContainer.classList.remove("isTikTokOrReelOrShort");
      thumbnailContainer.classList.add("isVideo");
    } else {
      thumbnailContainer.classList.remove("isVideo");
      thumbnailContainer.classList.add("isTikTokOrReelOrShort");
    }
  }
});
