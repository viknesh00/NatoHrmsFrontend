import { createAvatar } from "@dicebear/core";
import { identicon } from "@dicebear/collection";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type ProfileAvatarProps = {
  seed?: string;
  initials?: string;
  className?: string;
};

export default function ProfileAvatar({ seed, initials = "?", className }: ProfileAvatarProps) {
  const stableSeed = seed?.trim() || initials || "employee";
  const image = createAvatar(identicon, {
    seed: stableSeed,
    size: 96,
    backgroundColor: ["fcfcfd"],
    radius: 50,
  }).toDataUri();

  return (
    <Avatar className={className}>
      <AvatarImage src={image} alt="" />
      <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
    </Avatar>
  );
}
