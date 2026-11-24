"use client";
export function SpaceMilestone({createdAt}:{createdAt:string}){const start=new Date(createdAt);return <div className="space-milestone"><small>Space created since {start.toLocaleDateString()}</small></div>;}
