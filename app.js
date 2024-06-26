const express = require("express");
const he = require("he");
const { promisify } = require("util");
const rateLimit = require("express-rate-limit");
const path = require("path");
const ytdl = require("ytdl-core");
const { facebook } = require("fy-downloader-new");
const getFBInfo = require("@xaviabot/fb-downloader");
const { TiktokDownloader } = require("@xSaadRM/tiktok-api-dl");
const axios = require("axios");
const winston = require("winston");
const fs = require("fs");
const writeFileAsync = promisify(fs.writeFile);
const { v4: uuidv4 } = require("uuid");
const { format } = require("date-fns");
const heicConvert = require("heic-convert")
const app = express();

app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: "Too many requests, please try again later.",
});
app.use("/tikinfo", limiter);

const logFilePath = path.join(
  __dirname,
  `logs/error_${format(new Date(), "yyyy-MM-dd")}.log`
);
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      (info) => `${info.timestamp} => ${info.level}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: logFilePath, level: "error" }),
  ],
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  logger.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/en", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/ar", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index_ar.html"));
});

app.get("/es", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index_es.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/contact", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "contact.html"));
});

const pathToSitemap = path.join(__dirname, "sitemap.xml");

app.get("/sitemap.xml", (req, res) => {
  res.header("Content-Type", "application/xml");
  res.sendFile(pathToSitemap);
});

app.get("/ytinfo", async (req, res, next) => {
  try {
    const ytUrl = req.query.ytUrl;
    let ytInfo = await ytdl.getInfo(ytUrl);
    const videoThumbnail = ytInfo.videoDetails.thumbnails[2].url;
    const videoTitle = ytInfo.videoDetails.title;
    const videoAuthor = ytInfo.videoDetails.author;

    const videoFormats = ytInfo.formats.filter((format) => {
      return format.hasVideo && format.hasAudio && format.container === "mp4";
    });

    const audioFormats = ytInfo.formats.filter((format) => {
      return !format.hasVideo && format.hasAudio;
    });

    // Function to fetch content length of a URL
    const getContentLength = async (url) => {
      try {
        const response = await axios.head(url); // Send a HEAD request to get headers
        return response.headers["content-length"]; // Extract content length
      } catch (error) {
        logger.error("Error fetching content length:", error);
        return null;
      }
    };

    // Function to convert bytes to human-readable format
    const formatBytes = (bytes) => {
      if (bytes === 0) {
        return "0 Bytes";
      }
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Modify the code snippet within the existing logic to use the formatBytes function
    const videoFormatsWithSizes = [];
    for (const format of videoFormats) {
      const contentLength = await getContentLength(format.url);
      videoFormatsWithSizes.push({
        ...format,
        fileSize: contentLength ? formatBytes(parseInt(contentLength)) : null, // Convert bytes to human-readable format
      });
    }

    const audioFormatsWithSizes = [];
    for (const format of audioFormats) {
      const contentLength = await getContentLength(format.url);
      audioFormatsWithSizes.push({
        ...format,
        fileSize: contentLength ? formatBytes(parseInt(contentLength)) : null, // Convert bytes to human-readable format
      });
    }
    const ytVidID = uuidv4();
    const availableQualities = videoFormatsWithSizes.map((format) => ({
      itag: format.itag,
      quality: format.qualityLabel || format.quality,
      mimeType: format.mimeType,
      url: `/vdl/${ytVidID}?&f=${format.qualityLabel}`,
      codecs: format.codecs,
      fileSize: format.fileSize, // Include file size in the response
    }));

    const availableAudioFormats = audioFormatsWithSizes.map((format) => ({
      itag: format.itag,
      bitrate: `${format.audioBitrate} kbps`,
      mimeType: format.mimeType,
      url: `/vdl/${ytVidID}?&f=audio`,
      codecs: format.codecs,
      fileSize: format.fileSize, // Include file size in the response
    }));

    const videoBasicDetails = {
      title: videoTitle,
      thumbnail: videoThumbnail,
      qualities: availableQualities,
      audio: availableAudioFormats,
      author: videoAuthor,
    };
    res.send({ videoDetails: videoBasicDetails });
const _360pArray = videoFormats.find(
  (format) => format.qualityLabel == "360p"
);
const _720pArray = videoFormats.find(
  (format) => format.qualityLabel == "720p"
);
const audioArray = audioFormats.find(
  (format) => format.audioBitrate == "160" || format.audioBitrate == "128"
);

const info = {
  title: videoTitle,
  _360p: _360pArray?.url,
  _720p: _720pArray?.url,
  audio: audioArray?.url,
};

if (Object.values(info).some((value) => value !== undefined)) {
  // At least one property was found, proceed with writing to the file
  fs.writeFileSync(
    path.join(__dirname, `data/users/VidIDs/${ytVidID}.json`),
    JSON.stringify(info)
  );
} else {
  // Handle the case where no properties were found
  logger.error("No valid properties found when creating info object.");
}
  } catch (error) {
    logger.error("Error fetching YouTube video info:", error);
    res.status(500).json("Error fetching YouTube video info");
  }
});
app.get("/tikinfo", async (req, res, next) => {
  try {
    const tikUrl = req.query.tikUrl;
    const uservidID = uuidv4();
    const uservidIDjsonPath = `data/users/VidIDs/${uservidID}.json`;

    if (!tikUrl) {
      return res.status(400).json({ error: "Missing TikTok URL" });
    }

    const tikDl = await TiktokDownloader(tikUrl, {
      version: "v1",
    });

    if (
      tikDl.status === "error" &&
      tikDl.message ===
        "Failed to find tiktok data. Make sure your tiktok url is correct!"
    ) {
      return res
        .status(500)
        .json(
          "Failed to find tiktok data. Make sure your tiktok url is correct!"
        );
    }

    let info = {
      title: tikDl.result.description || "Title not found in the fetched data.",
      author:
        tikDl.result.author.username || "Author not found in the fetched data.",
      authorName:
        tikDl.result.author.nickname ||
        "Author Name not found in the fetched data.",
    };

    if (tikDl.result.type !== "image") {
      info.thumbnail =
        tikDl.result.cover || "Thumbnail not found in the fetched data.";
      info.thumbnail64 = await getBase64FromURL(tikDl.result.cover, "jpg");
      info.hd = tikDl.result.video
        ? `${uservidID}?&f=1080p`
        : "HD link not found in the fetched data.";
      info.audio = tikDl.result.music.playUrl
        ? `${uservidID}?&f=audio`
        : "Audio link not found in the fetched data.";

      res.json(info);
      info.audio = tikDl.result.music.playUrl;
      info._1080p = tikDl.result.video[0];
    } else {
      info.images = tikDl.result.images
        ? await getBase64FromURLs(tikDl.result.images, "heic")
        : "can't get slidshow images";
      info.thumbnail64 = tikDl.result.images[0]
        ? await getBase64FromURL(tikDl.result.images[0], "heic")
        : "image64 not found";
      info.audio = tikDl.result.music.playUrl
        ? `${uservidID}?&f=audio`
        : "Audio link not found in the fetched data.";

      res.json(info);
      info.audio = tikDl.result.music.playUrl;
    }

    fs.writeFile(uservidIDjsonPath, JSON.stringify(info, null, 2), (err) => {
      if (err) {
        logger.error("Error writing file:", err);
      }
    });
  } catch (error) {
    logger.error("Error fetching TikTok data:", error);
    res.status(500).json("Internal server error");
  }
});


const facebookAsync = promisify(facebook);

app.get("/fbinfo", async (req, res) => {
  try {
    const fbUrl = req.query.fbUrl;
    let info;
    if (!fbUrl) {
      return res.status(400).json({ error: "No URL provided" });
    }

    const data = await facebookAsync(fbUrl);
        info = {
          title: data.title,
          thumbnail: data.vid.thumbnail,
          author: data.vid.author.name,
          _360p: data.download.mp4,
          _720p: data.download.mp4Hd,
          audio: data.download.mp3,
        };

    if (!info.thumbnail) {
      const data2 = await getFBInfo(fbUrl);
        info.title = he.decode(data2.title);
        info.thumbnail = data2.thumbnail;
        info._360p = data2.sd;
        info._720p = data2.hd;
    }



    const uservidID = uuidv4();
    const uservidIDjsonPath = `data/users/VidIDs/${uservidID}.json`;

    await writeFileAsync(uservidIDjsonPath, JSON.stringify(info));

    info.sd = `${uservidID}?&f=360p`;
    info.hd = `${uservidID}?&f=720p`;
    info.audio = `${uservidID}?&f=audio`;

    res.json(info);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/vdl/:ressourceID", async (req, res, next) => {
  try {
    const ressourceID = req.params.ressourceID;
    const requestedFormat = req.query.f;
    const ressourceIDjsonPath = path.join(
      __dirname,
      `data/users/VidIDs/${ressourceID}.json`
    );
    const data = fs.readFileSync(ressourceIDjsonPath, "utf8");
    const info = JSON.parse(data);
    let tikUrl;
    if (requestedFormat === "360p") {
      tikUrl = info._360p;
    } else if (requestedFormat === "720p") {
      tikUrl = info._720p;
    } else if (requestedFormat === "1080p") {
      tikUrl = info._1080p;
    } else if (requestedFormat === "audio") {
      tikUrl = info.audio;
    } else {
      res.status(400).json({ error: "Invalid format" });
      return;
    }
    const response = await axios.get(tikUrl, { responseType: "stream" });
    if (response.status === 404) {
      logger.error("TikTok video not found:", tikUrl);
      throw new Error("TikTok video not found");
    }
    let fileType;
    if (requestedFormat === "720p" || requestedFormat === "1080p" || requestedFormat === "360p") {
      fileType = "mp4";
      res.setHeader("Content-Type", "video/mp4");
    } else if (requestedFormat == "audio") {
      fileType = "mp3";
      res.setHeader("Content-Type", "audio/mpeg");
    }
    const tikFileName = `Downit.xyz - ${requestedFormat} - ${encodeURIComponent(info.title)}.${fileType}`;

    res.setHeader("Content-Disposition", `attachment; filename=${tikFileName}`);

    const contentLength = response.headers["content-length"];
    res.setHeader("Content-Length", contentLength);

    res.status(200);
     console.log(requestedFormat, fileType);
    // Pipe the TikTok video response to the Express response
    response.data.pipe(res);
    // Optionally, you can handle errors if the download fails
    response.data.on("error", (err) => {
      logger.error("Error downloading TikTok video:", err.message);
      res.status(500).json({ error: "Error downloading TikTok video" });
    });
    // Optionally, you can handle the end of the stream
    response.data.on("end", () => {
      logger.info("TikTok video download completed");
    });
  } catch (error) {
    logger.error("Error downloading TikTok video:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.use((req, res, next) => {
  res.status(404).sendFile(__dirname + "/public/404.html");
});

async function getBase64FromURL(imageURL, format) {
  try {
    let base64Data
    const response = await axios.get(imageURL, { responseType: "arraybuffer" });
    if (format == 'heic') {
      // Convert HEIC to JPEG
      jpegBuffer = await heicConvert({
        buffer: response.data,
        format: "JPEG", // Convert to JPEG format
        quality: 1, // Adjust the quality as needed
      });
      base64Data = jpegBuffer.toString("base64");
    } else {
      base64Data = Buffer.from(response.data, 'binary').toString('base64');
    }

    return `data:image/jpeg;base64,${base64Data}`;
  } catch (error) {
    console.error("Error fetching or converting image:", error);
    throw error;
  }
}

async function getBase64FromURLs(imageURLs, format) {
  try {
    const base64Images = [];

    for (const imageURL of imageURLs) {
      const response = await axios.get(imageURL, {
        responseType: "arraybuffer",
      });
      let base64Data;

      if (format === "heic") {
        // Convert HEIC to JPEG
        const jpegBuffer = await heicConvert({
          buffer: Buffer.from(response.data),
          format: "JPEG",
          quality: 1,
        });
        base64Data = jpegBuffer.toString("base64");
      } else {
        base64Data = Buffer.from(response.data).toString("base64");
      }

      base64Images.push(`data:image/jpeg;base64,${base64Data}`);
    }

    return base64Images;
  } catch (error) {
    console.error("Error fetching or converting images:", error);
    throw error;
  }
}

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
