"use client";
import { createPost } from "@/actions/post.action";
import { useUser } from "@clerk/nextjs";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ImageIcon, Loader2Icon, SendIcon } from "lucide-react";

function CreatePost() {
  const { user } = useUser();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const uploadToIPFS = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.IpfsHash) {
        return `https://peach-careful-stoat-161.mypinata.cloud/ipfs/${result.IpfsHash}`;
      } else {
        throw new Error("IPFS upload failed");
      }
    } catch (error) {
      console.error("IPFS Upload Error:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) return;

    setIsPosting(true);
    try {
      let uploadedImageUrl = "";
      if (imageFile) {
        uploadedImageUrl = await uploadToIPFS(imageFile) || "";
        setImageUrl(uploadedImageUrl);
      }

      const result = await createPost(content, uploadedImageUrl);
      if (result?.success) {
        setContent("");
        setImageFile(null);
        setImageUrl("");
        toast.success(uploadedImageUrl ? "Posted successfully! Wanna make an NFT?" : "Post created successfully");
      } else {
        toast.error("Login to vibe with us");
      }
    } catch (error) {
      console.log("Error in createPost", error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.imageUrl || "/avatar.png"} />
            </Avatar>
            <Textarea
              placeholder="What's on your mind?"
              className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0 text-base"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPosting}
            />
          </div>

          {/* Hidden File Input (triggered by Attach button) */}
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isPosting}
          />

          {imageFile && (
            <div className="border text-sm rounded-lg p-4 mt-2">
              <p> ✔ {imageFile.name}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex space-x-2">
              <Button
                type="button"
                size="sm"
                className="dark:bg-neutral-400 dark:text-black text-white bg-neutral-700"
                onClick={() => fileInputRef.current?.click()} // 🔹 Triggers file picker
                disabled={isPosting}
              >
                <ImageIcon className="size-4 mr-2" />
                Attach
              </Button>
            </div>
            <Button
              className="flex items-center"
              onClick={handleSubmit}
              disabled={(!content.trim() && !imageFile) || isPosting}
            >
              {isPosting ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <SendIcon className="size-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CreatePost;
