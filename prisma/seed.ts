import {
    PrismaClient,
    VideoEngagement,
    type User,
    type Video,
    type FollowEngagement,
    type Announcement,
    type AnnouncementEngagement,
    type Comment,
    type Playlist,
    type PlaylistHasVideo
} from '@prisma/client'

import path from 'path'
import fs from 'fs'

// Load the data from the JSON files
const prisma = new PrismaClient();

// Function to process the data in chunks
async function processChunks<T,U>(
    items: T[],
    chunkSize: number,
    processItem: (item: T) => Promise<U>
) : Promise<U[]> {
    const results: U[] = [];
    for(let i=0; i<items.length; i+=chunkSize) {
        const chunk = items.slice(i, i+chunkSize);
        const chunkPromises = await Promise.all(chunk.map(processItem));
        results.push(...chunkPromises);
    }
    return results;
}

// Getting the path to the JSON files
const usersFile = path.join(__dirname, 'data/user.json');
const videosFile = path.join(__dirname, 'data/video.json');
const videoEngagementsFile = path.join(__dirname, 'data/videoEngagement.json');
const followEngagementsFile = path.join(__dirname, 'data/followEngagement.json');
const announcementsFile = path.join(__dirname, 'data/announcement.json');
const announcementEngagementsFile = path.join(__dirname, 'data/announcementEngagement.json');
const commentsFile = path.join(__dirname, 'data/comment.json');
const playlistsFile = path.join(__dirname, 'data/playlist.json');
const playlistHasVideoFile = path.join(__dirname, 'data/playlistHasVideo.json');

// Loading the data from the JSON files
const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8')) as User[];
const videos : Video[] = JSON.parse(fs.readFileSync(videosFile, 'utf-8')) as Video[];
const videoEngagements : VideoEngagement[] = JSON.parse(fs.readFileSync(videoEngagementsFile, 'utf-8')) as VideoEngagement[];
const followEngagements: FollowEngagement[] = JSON.parse(fs.readFileSync(followEngagementsFile, 'utf-8')) as FollowEngagement[];
const announcements: Announcement[] = JSON.parse(fs.readFileSync(announcementsFile, 'utf-8')) as Announcement[];
const announcementEngagements: AnnouncementEngagement[] = JSON.parse(fs.readFileSync(announcementEngagementsFile, 'utf-8')) as AnnouncementEngagement[];
const comments: Comment[] = JSON.parse(fs.readFileSync(commentsFile, 'utf-8')) as Comment[];
const playlists: Playlist[] = JSON.parse(fs.readFileSync(playlistsFile, 'utf-8')) as Playlist[];
const playlistHasVideos: PlaylistHasVideo[] = JSON.parse(fs.readFileSync(playlistHasVideoFile, 'utf-8')) as PlaylistHasVideo[];

// Function to generate next id between a range
const generateNextId = (start: number, end: number) => {
    let current = start;
    return function getNextId(){
        const nextId = current;
        current = current >= end ? start : current + 1;
        return nextId.toString();
    }
};

const getNextVideoId = generateNextId(1, 31);
const getNextUserId = generateNextId(164, 178);
// TODO : we have hardcoded the user and video id here, we need to change it to dynamic


const cloudinaryName = process.env.NEXT_PUBLIC_CLOUDINARY_NAME || '';

async function main() {
    // Clear out the database by deleting all records from the tables
    await prisma.user.deleteMany({});
    await prisma.video.deleteMany({});
    await prisma.videoEngagement.deleteMany({});
    await prisma.followEngagement.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.announcementEngagement.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.playlist.deleteMany({});
    await prisma.playlistHasVideo.deleteMany({});

    // Seed the database and populate the tables with new data
    await processChunks(users, 1, async (user) => 
        // Here we use the upsert method to either create or update the user
        prisma.user.upsert({
            where: { id: user.id },
            update: {
                ...user,
                emailVerified: user.emailVerified ? new Date(user.emailVerified) : undefined,
                image: user.image ? `https://res.cloudinary.com/${cloudinaryName}${user.image}` : null,
                backgroundImage: user.backgroundImage ? `https://res.cloudinary.com/${cloudinaryName}${user.backgroundImage}` : null
            },
            create: {
                ...user,
                emailVerified: user.emailVerified ? new Date(user.emailVerified) : undefined,
                image: user.image ? `https://res.cloudinary.com/${cloudinaryName}${user.image}` : null,
                backgroundImage: user.backgroundImage ? `https://res.cloudinary.com/${cloudinaryName}${user.backgroundImage}` : null
            }
        })
    );

    await processChunks(videos, 1, (video) => prisma.video.upsert({
        where: { id: video.id },
        update: {
            ...video,
            createdAt: video.createdAt ? new Date(video.createdAt) : undefined,
            thumbnailUrl: `https://res.cloudinary.com/${cloudinaryName}${video.videoUrl}`,
            videoUrl: `https://res.cloudinary.com/${cloudinaryName}${video.videoUrl}`
        },
        create: {
            ...video,
            createdAt: video.createdAt ? new Date(video.createdAt) : undefined,
            thumbnailUrl: `https://res.cloudinary.com/${cloudinaryName}${video.videoUrl}`,
            videoUrl: `https://res.cloudinary.com/${cloudinaryName}${video.videoUrl}`
        }
    }))

    await processChunks(videoEngagements, 1, (videoEngagement) => 
        prisma.videoEngagement.create({data:videoEngagement})
    );

    await processChunks(followEngagements, 1, async (followEngagement) => {
        const existingFollowEngagements = await prisma.followEngagement.findMany({
            where: {
                followerId: followEngagement.followerId,
                followingId: followEngagement.followingId,
            },
        });
        if(
            existingFollowEngagements.length === 0 ||
            !existingFollowEngagements
        ){
            return prisma.followEngagement.create({ data: followEngagement });
        }else{
            return;
        }
    })

    await processChunks(announcements, 1, (announcement) => 
        prisma.announcement.create({data:announcement})
    );

    await processChunks(announcementEngagements, 1, async (announcementEngagements) => {
        // find existing annoucement engagements if any, with announcement or user ID
        const exisitingAnnouncementEngagements = await prisma.announcementEngagement.findMany({
            where: {
                announcementId: announcementEngagements.announcementId,
                userId: announcementEngagements.userId,
            },
        });

        if(
            exisitingAnnouncementEngagements.length === 0 ||
            !exisitingAnnouncementEngagements
        ){
            return prisma.announcementEngagement.create({ data: announcementEngagements });
        }else{
            return;
        }
    });

    await processChunks(comments, 1, (comment) => 
        prisma.comment.upsert({
            where: { id: comment.id },
            update: {
                ...comment,
                userId: getNextUserId(),
                videoId: getNextVideoId(),
                createdAt: comment.createdAt ? new Date(comment.createdAt) : undefined,
            },
            create: {
                ...comment,
                userId: getNextUserId(),
                videoId: getNextVideoId(),
                createdAt: comment.createdAt ? new Date(comment.createdAt) : undefined,
            
            }
        })
    );

    await processChunks(playlists, 1, async (playlist) => 
        prisma.playlist.upsert({
            where: {id: playlist.id},
            update: {
                ...playlist,
                userId: getNextUserId(),
                createdAt: playlist.createdAt ? new Date(playlist.createdAt) : undefined,                
            },
            create: {
                ...playlist,
                userId: getNextUserId(),
                createdAt: playlist.createdAt ? new Date(playlist.createdAt) : undefined,
            },
        })
    );

    await processChunks(playlistHasVideos, 1, (playlistHasVideo) => 
        prisma.playlistHasVideo.create({
            data: playlistHasVideo
        })
    );
}

main()
  .catch((e) => {console.log(e)})
  .finally(() => {
    void prisma.$disconnect();
  });