using Microsoft.EntityFrameworkCore;
using Streaming.Models;

namespace Streaming.Data
{
    public class StreamingDbContext : DbContext
    {
        public StreamingDbContext(DbContextOptions<StreamingDbContext> options)
            : base(options)
        {
        }

        // Removed Streamers DbSet since we have only one streamer (configured in appsettings.json)
        public DbSet<VideoStream> VideoStreams { get; set; }
        public DbSet<StreamSettings> StreamSettings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure VideoStream entity
            modelBuilder.Entity<VideoStream>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(2000);
                entity.Property(e => e.StreamerName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
                entity.Property(e => e.StreamUrl).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Category).HasMaxLength(50);
                entity.Property(e => e.StartedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configure StreamSettings entity
            modelBuilder.Entity<StreamSettings>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StreamDescription).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.StreamKey).IsRequired().HasMaxLength(255);
                entity.Property(e => e.StreamTitle).IsRequired().HasMaxLength(200);
            });
        }
    }
}