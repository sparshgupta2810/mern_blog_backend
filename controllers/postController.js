const HttpError = require("../models/errorModels");
const Post = require("../models/postModel");
const User = require("../models/userModel");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const createPost = async (req, res, next) => {
  try {
    const { title, category, description } = req.body;
    const { thumbnail } = req.files;

    if (!title || !category || !description || !thumbnail) {
      return next(new HttpError("Please fill in all fields and choose a thumbnail", 422));
    }

    if (thumbnail.size > 2000000) {
      return next(new HttpError("Thumbnail is too big. Make it less than 2MB", 422));
    }

    const fileName = thumbnail.name;
    const splittedFilename = fileName.split(".");
    const newFilename = `${splittedFilename[0]}${uuid()}.${splittedFilename[splittedFilename.length - 1]}`;

    const uploadPath = path.join(__dirname, "..", "uploads", newFilename);
    thumbnail.mv(uploadPath, async (err) => {
      if (err) {
        return next(new HttpError("File upload failed", 500));
      }

      try {
        const newPost = await Post.create({
          title,
          category,
          description,
          thumbnail: newFilename,
          creator: req.user.id,
        });

        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
          return next(new HttpError("User not found", 404));
        }

        currentUser.posts += 1;
        await currentUser.save();

        res.status(201).json(newPost);
      } catch (error) {
        return next(new HttpError("Post creation failed", 500));
      }
    });
  } catch (error) {
    return next(new HttpError("Server error", 500));
  }
};

const getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ updatedAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError("Fetching posts failed, please try again later.", 500));
  }
};

const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found", 404));
    }
    res.status(200).json(post);
  } catch (error) {
    return next(new HttpError("Fetching post failed, please try again later.", 500));
  }
};


const getCatPost = async (req, res, next) => {
  try {
    const { category } = req.params;

    const catPost = await Post.find({ category }).sort({ createdAt: -1 });

    if (!catPost || catPost.length === 0) {
      console.log(`No posts found for category: ${category}`); // Log if no posts found
    }

    res.status(200).json(catPost);
  } catch (error) {
    console.error('Error fetching category posts:', {
      message: error.message,
      stack: error.stack,
      category
    });
    return next(new HttpError("Fetching category posts failed, please try again later.", 500));
  }
};



const getUserPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });

    if (!posts || posts.length === 0) {
      return res.status(404).json({ message: 'No posts found for this user.' });
    }

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return next(new HttpError("Fetching user posts failed, please try again later.", 500));
  }
};



const editPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const { title, category, description } = req.body;

    if (!title || !category || description.length < 12) {
      return next(new HttpError("Please fill in all fields", 422));
    }

    let updatedPost = await Post.findById(postId);
    if (!updatedPost) {
      return next(new HttpError("Post not found", 404));
    }

    if (req.files) {
      const { thumbnail } = req.files;

      if (thumbnail.size > 2000000) {
        return next(new HttpError("Thumbnail is too big. Make it less than 2MB", 422));
      }

      const oldThumbnailPath = path.join(__dirname, "..", "uploads", updatedPost.thumbnail);
      fs.unlink(oldThumbnailPath, (err) => {
        if (err) {
          return next(new HttpError("Deleting old thumbnail failed", 500));
        }
      });

      const fileName = thumbnail.name;
      const splittedFilename = fileName.split(".");
      const newFilename = `${splittedFilename[0]}${uuid()}.${splittedFilename[splittedFilename.length - 1]}`;

      const uploadPath = path.join(__dirname, "..", "uploads", newFilename);
      thumbnail.mv(uploadPath, async (err) => {
        if (err) {
          return next(new HttpError("Thumbnail upload failed", 500));
        }
      });

      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { title, category, description, thumbnail: newFilename },
        { new: true }
      );
    } else {
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { title, category, description },
        { new: true }
      );
    }

    if (!updatedPost) {
      return next(new HttpError("Couldn't update post", 400));
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError("Server error", 500));
  }
};

const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!postId) {
      return next(new HttpError("Post ID not provided", 422));
    }

    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found", 404));
    }

    const filePath = path.join(__dirname, "..", "uploads", post.thumbnail);
    fs.unlink(filePath, async (err) => {
      if (err) {
        return next(new HttpError("File deletion error", 500));
      }

      await Post.findByIdAndDelete(postId);

      const currentUser = await User.findById(req.user.id);
      if (currentUser) {
        currentUser.posts -= 1;
        await currentUser.save();
      }

      res.json({ message: `Post ${postId} deleted successfully.` });
    });
  } catch (error) {
    return next(new HttpError("Server error", 500));
  }
};

module.exports = {
  createPost,
  getPosts,
  getPost,
  getCatPost,
  getUserPost,
  editPost,
  deletePost,
};

