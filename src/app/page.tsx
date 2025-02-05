import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";

export default function Home() {
  return (
  <div>
    <SignedOut>
      <SignInButton mode="modal">
        <button className="bg-red-500">SignIn</button>
        </SignInButton>
        </SignedOut>
        <SignedIn>
      <UserButton />
      </SignedIn>
  </div>
 );
}
