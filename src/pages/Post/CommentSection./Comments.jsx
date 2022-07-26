import "./Comments.css";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { useAuthContext } from "../../../hooks/useAuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { AiFillLike, AiOutlineLike } from "react-icons/ai";
import { CgProfile } from "react-icons/cg";
import CommentModal from "./CommentModal";
import { Image } from "cloudinary-react";

const Comments = ({ isLoading, postId, setIsLoading }) => {
  const [allComments, setAllComments] = useState([]);
  const [allCommentsLikes, setAllCommentsLikes] = useState([]);
  const [toggleCommentModal, setToggleCommentModal] = useState(false);
  const [toCommentDelete, setToCommentDelete] = useState(false);
  const [toCommentEdit, setToCommentEdit] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_DB}/api/comment/${postId}`)
      .then((res) => {
        setAllComments(res.data.comments);
      })
      .catch((error) => {
        console.log(error);
      });

    // get all user comment likes if user is logged in
    if (user) {
      axios
        .get(`${process.env.REACT_APP_API_DB}/api/comment/likes/allLikes`, {
          headers: { jwtToken: user.token },
        })
        .then((res) => {
          setAllCommentsLikes(
            res.data.likedComments.map((like) => like.CommentId)
          );
        })
        .catch((error) => {
          console.log(error);
        });
    }
  }, [postId, user]);

  const initialvalues = {
    commentText: "",
    commentImg: "",
  };

  const validationSchema = Yup.object().shape({
    commentText: Yup.string().max(140).required("don't leave text input blank"),
    commentImg: Yup.mixed(),
  });

  // post a comment
  const handleSubmit = (data, onSubmitProps) => {
    setIsLoading(true);
    onSubmitProps.resetForm();
    // if user is not logged in
    if (!user) {
      console.log("log in");
      return navigate("/login");
    }

    // if user makes a post with just text and without a image
    if (!data.commentImg) {
      axios
        .post(
          `${process.env.REACT_APP_API_DB}/api/comment`,
          {
            commentText: data.commentText,
            commentImg: "",
            PostId: postId,
          },
          {
            headers: { jwtToken: user.token },
          }
        )
        .then((res) => {
          console.log(res.data);
          setIsLoading(false);
          const newComment = res.data.comment;
          newComment.CommentLikes = [];
          setAllComments((prev) => [...prev, newComment]);
        })
        .catch((error) => {
          console.log(error.response.data.error);
          alert(error.response.data.error);
        });
    } else {
      // if user includes a image with the post
      const formData = new FormData();
      formData.append("file", data.commentImg);
      formData.append("upload_preset", "jhpnjpgh");

      // send the postImg data to cloudinary
      axios
        .post(
          `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUD_NAME}/upload`,
          formData
        )
        .then((res) => {
          // get back the image asset id from cloudary
          const fileName = res.data.public_id;

          // then send all the text and img asset id to the database
          axios
            .post(
              `${process.env.REACT_APP_API_DB}/api/comment`,
              {
                commentText: data.commentText,
                commentImg: fileName,
                PostId: postId,
              },
              {
                headers: { jwtToken: user.token },
              }
            )
            .then((res) => {
              const newComment = res.data.comment;
              newComment.CommentLikes = [];
              setAllComments((prev) => [...prev, newComment]);
              setIsLoading(false);
            });
        })
        .catch((err) => {
          console.log(err);
          alert(err.response.data.error);
        });
    }
  };

  const showCommentDelete = () => {
    setToggleCommentModal(true);
    setToCommentDelete(true);
  };

  const showCommentEdit = () => {
    setToggleCommentModal(true);
    setToCommentEdit(true);
  };

  // like a comment
  const likeComment = (CommentId) => {
    if (!user) {
      console.log("log in");
      return navigate("/login");
    }

    axios
      .post(
        `${process.env.REACT_APP_API_DB}/api/comment/likes`,
        {
          CommentId,
        },
        {
          headers: { jwtToken: user.token },
        }
      )
      .then((res) => {
        console.log(res.data);
        setAllComments((prev) => {
          return prev.map((c) => {
            if (c.id === CommentId) {
              if (res.data.liked) {
                return { ...c, CommentLikes: [...c.CommentLikes, res.data] };
              } else {
                const likesArray = c.CommentLikes;
                likesArray.pop();
                console.log(likesArray);
                return { ...c, CommentLikes: [likesArray] };
              }
            } else {
              return c;
            }
          });
        });
      })
      .catch((error) => {
        console.log(error);
      });

    // some jank way of toggling the liked icons based on the current login user
    if (allCommentsLikes.includes(CommentId)) {
      setAllCommentsLikes((prev) => prev.filter((i) => i !== CommentId));
    } else {
      setAllCommentsLikes((prev) => [...prev, CommentId]);
    }
  };

  return (
    <div className="comment-container">
      <div className="create-comment-container">
        <h2>Reply with a comment</h2>
        <Formik
          initialValues={initialvalues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formProps) => (
            <Form className="createCommentform">
              <ErrorMessage name="commentText" component="span" />
              <Field
                id="createpost"
                as="textarea"
                name="commentText"
                placeholder="write comment here!"
              />
              <input
                id="createpostimg"
                type="file"
                name="commentImg"
                //   had to use a different function prop to get the image cuz formik doesn't use
                //   the default file selector
                onChange={(event) => {
                  formProps.setFieldValue("commentImg", event.target.files[0]);
                }}
              />

              {isLoading ? (
                <div className="isloadingIcon postloading"></div>
              ) : (
                <div className="commentBtn-container">
                  <button className="createCommentBtn" type="submit">
                    reply
                  </button>
                </div>
              )}
            </Form>
          )}
        </Formik>
      </div>
      <div className="comment-flex">
        {allComments.map((comment) => (
          <div className="single-comment" key={comment.id}>
            <div className="comment-user-info">
              <p
                className="post-username"
                onClick={() => navigate(`/profile/${comment.UserId}`)}
              >
                <CgProfile /> {comment.username}
              </p>
              <p className="post-posted-date">
                replied{" "}
                {formatDistanceStrict(new Date(comment.updatedAt), new Date(), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <p className="post-comment-text">{comment.commentText}</p>
            {comment.commentImg && (
              <div className="post-img-container">
                <Image
                  cloudName={process.env.REACT_APP_CLOUD_NAME}
                  publicId={comment.commentImg}
                />
              </div>
            )}
            <div className="post-interactions">
              <div className="post-likes">
                {/* the button shows blue if user is logged in and liked the post */}
                {user && allCommentsLikes.includes(comment.id) ? (
                  <AiFillLike
                    color="#02b9f2"
                    size="1.5em"
                    className="like-icon"
                    onClick={() => likeComment(comment.id)}
                  />
                ) : (
                  <AiOutlineLike
                    size="1.5em"
                    className="like-icon"
                    onClick={() => likeComment(comment.id)}
                  />
                )}
                <p className="post-like-amount">
                  {comment.CommentLikes ? comment.CommentLikes.length : 0} likes
                </p>
              </div>

              {/* if user is loggin and if their username is the same as the post username */}
              {user && user.username === comment.username && (
                <div className="post-functions">
                  <button className="post-edit" onClick={showCommentEdit}>
                    EDIT
                  </button>
                  <button className="post-delete" onClick={showCommentDelete}>
                    DELETE
                  </button>
                </div>
              )}
            </div>

            {toggleCommentModal && (
              <div className="post-backdrop">
                <CommentModal
                  setToggleCommentModal={setToggleCommentModal}
                  setToCommentDelete={setToCommentDelete}
                  setToCommentEdit={setToCommentEdit}
                  toCommentDelete={toCommentDelete}
                  toCommentEdit={toCommentEdit}
                  commentId={comment.id}
                  commentText={comment.commentText}
                  setAllComments={setAllComments}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;
