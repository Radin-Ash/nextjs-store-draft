"use client";

import { useToast } from "../ui/use-toast";
import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

function SignOutLink() {
  const { toast } = useToast();
  const handleLOgout = () => {
    toast({ description: "Logout Successful" });
  };
  return (
    <SignOutButton>
      <Link href="/" className="w-full text-left" onClick={handleLOgout}>
        Logout
      </Link>
    </SignOutButton>
  );
}

export default SignOutLink;
