import { prisma } from "./lib/prisma.js";

async function main() {
  // Clean up existing records to allow re-running the script cleanly
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();

  const dummyUsers = [
    {
      username: "alice_dev",
      email: "alice@prisma.io",
      password: "hashed_password_123",
      folders: [
        {
          name: "Documents",
          files: [
            {
              name: "Resume.pdf",
              link: "https://storage.provider.com/files/resume.pdf",
              size: 102400,
            },
          ],
          children: [
            {
              name: "Work Projects",
              files: [
                {
                  name: "Project_Spec.docx",
                  link: "https://storage.provider.com/files/spec.docx",
                  size: 512000,
                },
              ],
            },
          ],
        },
        {
          name: "Photos",
          files: [
            {
              name: "avatar.png",
              link: "https://storage.provider.com/files/avatar.png",
              size: 2048000,
            },
          ],
        },
      ],
      rootFiles: [
        {
          name: "notes.txt",
          link: "https://storage.provider.com/files/notes.txt",
          size: 1024,
        },
      ],
    },
    {
      username: "bob_builder",
      email: "bob@prisma.io",
      password: "hashed_password_456",
      folders: [
        {
          name: "Blueprints",
          files: [
            {
              name: "HousePlan_v1.dwg",
              link: "https://storage.provider.com/files/plan1.dwg",
              size: 15485760,
            },
          ],
        },
      ],
      rootFiles: [
        {
          name: "Invoice_001.pdf",
          link: "https://storage.provider.com/files/inv001.pdf",
          size: 204800,
        },
      ],
    },
    {
      username: "charlie_creative",
      email: "charlie@prisma.io",
      password: "hashed_password_789",
      folders: [
        {
          name: "Audio Tracks",
          files: [
            {
              name: "Intro_Song.mp3",
              link: "https://storage.provider.com/files/track1.mp3",
              size: 4194304,
            },
          ],
          children: [
            {
              name: "Raw Takes",
              files: [
                {
                  name: "Take_1.wav",
                  link: "https://storage.provider.com/files/take1.wav",
                  size: 31457280,
                },
              ],
            },
          ],
        },
      ],
      rootFiles: [],
    },
    {
      username: "diana_design",
      email: "diana@prisma.io",
      password: "hashed_password_321",
      folders: [],
      rootFiles: [
        {
          name: "DesignSystem.fig",
          link: "https://storage.provider.com/files/design.fig",
          size: 8388608,
        },
        {
          name: "BrandBook.pdf",
          link: "https://storage.provider.com/files/brand.pdf",
          size: 5242880,
        },
      ],
    },
    {
      username: "evan_tech",
      email: "evan@prisma.io",
      password: "hashed_password_654",
      folders: [
        {
          name: "Backups",
          files: [],
          children: [
            {
              name: "2026-Database-Dump",
              files: [
                {
                  name: "db_backup.sql",
                  link: "https://storage.provider.com/files/db.sql",
                  size: 104857600,
                },
              ],
            },
          ],
        },
      ],
      rootFiles: [
        {
          name: "todo.md",
          link: "https://storage.provider.com/files/todo.md",
          size: 512,
        },
      ],
    },
  ];

  for (const userData of dummyUsers) {
    // 1. Create User
    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        password: userData.password,
      },
    });

    // 2. Create Root Files for User
    for (const fileData of userData.rootFiles) {
      await prisma.file.create({
        data: {
          ...fileData,
          userId: user.id,
        },
      });
    }

    // 3. Create Folders, Subfolders, and Folder Files
    for (const folderData of userData.folders) {
      const parentFolder = await prisma.folder.create({
        data: {
          name: folderData.name,
          userId: user.id,
          files: {
            create: folderData.files.map((f) => ({
              ...f,
              userId: user.id,
            })),
          },
        },
      });

      if (folderData.children) {
        for (const subfolderData of folderData.children) {
          await prisma.folder.create({
            data: {
              name: subfolderData.name,
              userId: user.id,
              parentId: parentFolder.id,
              files: {
                create: subfolderData.files.map((f) => ({
                  ...f,
                  userId: user.id,
                })),
              },
            },
          });
        }
      }
    }
  }

  console.log(`Successfully seeded database with ${dummyUsers.length} users.`);

  // Verify the created data
  const allUsers = await prisma.user.findMany({
    include: {
      folders: {
        where: { parentId: null },
        include: {
          children: true,
          files: true,
        },
      },
      files: {
        where: { folderId: null },
      },
    },
  });

  console.log("Seeded Users Summary:", JSON.stringify(allUsers, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });