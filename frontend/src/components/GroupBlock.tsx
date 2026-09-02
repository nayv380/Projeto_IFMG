import { type ReactNode } from 'react';
import '../styles/groupblock.css'


interface GroupBlockProps {
  groupName: string;
  membersSlot: ReactNode;
  actionButtonSlot?: ReactNode;
  additionalMembersCount?: number | undefined;
  className?: string;
}


export default function GroupBlock({
  groupName,
  membersSlot,
  actionButtonSlot,
  additionalMembersCount = 0,
  className = '',
}: GroupBlockProps) {
  return (
    <section className={`group-block-container ${className}`.trim()}>
      <h3 className="group-block-title">{groupName}</h3>


      <div className="group-block-content">
        <div className="group-block-members">
          {membersSlot}


          {additionalMembersCount > 0 && (
            <span className="group-block-counter">+{additionalMembersCount}</span>
          )}
        </div>


        <div className="group-block-action">{actionButtonSlot}</div>
      </div>
    </section>
  );
}


