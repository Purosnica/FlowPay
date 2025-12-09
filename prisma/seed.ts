import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

  // Limpiar datos existentes (opcional, comentar si no quieres borrar datos)
  console.log("🧹 Limpiando datos existentes...");
  await prisma.chat.deleteMany();
  await prisma.device.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.overviewStats.deleteMany();
  await prisma.user.deleteMany();

  // Crear usuarios de ejemplo
  console.log("👤 Creando usuarios...");
  const user1 = await prisma.user.create({
    data: {
      email: "admin@flowpay.com",
      name: "Admin User",
      image: "/images/user/user-01.png",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "demo@flowpay.com",
      name: "Demo User",
      image: "/images/user/user-03.png",
    },
  });

  // Crear canales
  console.log("📺 Creando canales...");
  const channels = await Promise.all([
    prisma.channel.create({
      data: {
        name: "Google",
        visits: 3456,
        revenue: new Decimal("4220.00"),
        conversion: new Decimal("2.59"),
        userId: user1.id,
      },
    }),
    prisma.channel.create({
      data: {
        name: "X.com",
        visits: 2890,
        revenue: new Decimal("3850.00"),
        conversion: new Decimal("2.45"),
        userId: user1.id,
      },
    }),
    prisma.channel.create({
      data: {
        name: "Github",
        visits: 2100,
        revenue: new Decimal("3200.00"),
        conversion: new Decimal("2.10"),
        userId: user1.id,
      },
    }),
    prisma.channel.create({
      data: {
        name: "Vimeo",
        visits: 1500,
        revenue: new Decimal("2500.00"),
        conversion: new Decimal("1.80"),
        userId: user1.id,
      },
    }),
    prisma.channel.create({
      data: {
        name: "Facebook",
        visits: 4200,
        revenue: new Decimal("5100.00"),
        conversion: new Decimal("2.80"),
        userId: user1.id,
      },
    }),
  ]);

  // Crear dispositivos
  console.log("📱 Creando dispositivos...");
  await Promise.all([
    prisma.device.create({
      data: {
        name: "Desktop",
        percentage: new Decimal("0.65"),
        amount: 1625,
        userId: user1.id,
      },
    }),
    prisma.device.create({
      data: {
        name: "Tablet",
        percentage: new Decimal("0.10"),
        amount: 250,
        userId: user1.id,
      },
    }),
    prisma.device.create({
      data: {
        name: "Mobile",
        percentage: new Decimal("0.20"),
        amount: 500,
        userId: user1.id,
      },
    }),
    prisma.device.create({
      data: {
        name: "Unknown",
        percentage: new Decimal("0.05"),
        amount: 125,
        userId: user1.id,
      },
    }),
  ]);

  // Crear pagos
  console.log("💳 Creando pagos...");
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        amount: new Decimal("1500.00"),
        status: "RECEIVED",
        type: "INCOME",
        receivedAt: new Date(),
        userId: user1.id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: new Decimal("2500.00"),
        status: "PENDING",
        type: "INCOME",
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        userId: user1.id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: new Decimal("800.00"),
        status: "OVERDUE",
        type: "EXPENSE",
        dueAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 días atrás
        userId: user1.id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: new Decimal("3200.00"),
        status: "RECEIVED",
        type: "INCOME",
        receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        userId: user1.id,
      },
    }),
  ]);

  // Crear chats
  console.log("💬 Creando chats...");
  await Promise.all([
    prisma.chat.create({
      data: {
        name: "Jacob Jones",
        profile: "/images/user/user-01.png",
        isActive: true,
        lastMessage: "See you tomorrow at the meeting!",
        messageType: "text",
        timestamp: new Date(),
        isRead: false,
        unreadCount: 3,
        userId: user1.id,
      },
    }),
    prisma.chat.create({
      data: {
        name: "Wilium Smith",
        profile: "/images/user/user-03.png",
        isActive: true,
        lastMessage: "Thanks for the update",
        messageType: "text",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 horas atrás
        isRead: true,
        unreadCount: 0,
        userId: user1.id,
      },
    }),
    prisma.chat.create({
      data: {
        name: "Johurul Haque",
        profile: "/images/user/user-04.png",
        isActive: false,
        lastMessage: "What's up?",
        messageType: "text",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 día atrás
        isRead: true,
        unreadCount: 0,
        userId: user1.id,
      },
    }),
    prisma.chat.create({
      data: {
        name: "M. Chowdhury",
        profile: "/images/user/user-05.png",
        isActive: false,
        lastMessage: "Where are you now?",
        messageType: "text",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
        isRead: true,
        unreadCount: 2,
        userId: user1.id,
      },
    }),
    prisma.chat.create({
      data: {
        name: "Akagami",
        profile: "/images/user/user-07.png",
        isActive: false,
        lastMessage: "Hey, how are you?",
        messageType: "text",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 días atrás
        isRead: true,
        unreadCount: 0,
        userId: user1.id,
      },
    }),
  ]);

  // Crear estadísticas de overview
  console.log("📊 Creando estadísticas...");
  await prisma.overviewStats.create({
    data: {
      views: 3456,
      profit: new Decimal("4220.00"),
      products: 3456,
      users: 3456,
      viewsGrowth: new Decimal("0.43"),
      profitGrowth: new Decimal("4.35"),
      productsGrowth: new Decimal("2.59"),
      usersGrowth: new Decimal("-0.95"),
      period: "monthly",
    },
  });

  await prisma.overviewStats.create({
    data: {
      views: 41472,
      profit: new Decimal("50640.00"),
      products: 41472,
      users: 41472,
      viewsGrowth: new Decimal("0.43"),
      profitGrowth: new Decimal("4.35"),
      productsGrowth: new Decimal("2.59"),
      usersGrowth: new Decimal("-0.95"),
      period: "yearly",
    },
  });

  console.log("✅ Seed completado exitosamente!");
  console.log(`📝 Creados:`);
  console.log(`   - ${await prisma.user.count()} usuarios`);
  console.log(`   - ${await prisma.channel.count()} canales`);
  console.log(`   - ${await prisma.device.count()} dispositivos`);
  console.log(`   - ${await prisma.payment.count()} pagos`);
  console.log(`   - ${await prisma.chat.count()} chats`);
  console.log(`   - ${await prisma.overviewStats.count()} estadísticas`);
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
