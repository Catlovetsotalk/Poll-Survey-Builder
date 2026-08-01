using Microsoft.EntityFrameworkCore;
using Backend.Model;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Poll> Polls => Set<Poll>();
    public DbSet<PollOption> PollOptions => Set<PollOption>();
    public DbSet<Vote> Votes => Set<Vote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Poll>(entity =>
        {
            entity.HasIndex(p => p.Code).IsUnique();
            entity.Property(p => p.Code).HasMaxLength(16).IsRequired();
            entity.Property(p => p.Question).HasMaxLength(500).IsRequired();

            entity.HasMany(p => p.Options).WithOne(o => o.Poll)
                  .HasForeignKey(o => o.PollId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(p => p.Votes).WithOne(v => v.Poll)
                  .HasForeignKey(v => v.PollId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PollOption>(entity =>
        {
            entity.Property(o => o.Text).HasMaxLength(200).IsRequired();
            entity.HasIndex(o => new { o.PollId, o.OptionIndex }).IsUnique();
        });

        modelBuilder.Entity<Vote>(entity =>
        {
            entity.Property(v => v.VoterToken).HasMaxLength(64).IsRequired();
            entity.HasIndex(v => new { v.PollId, v.VoterToken }).IsUnique();
        });
    }
}