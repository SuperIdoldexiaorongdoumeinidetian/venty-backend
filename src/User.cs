using System;
using System.Collections.Generic;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Username { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string? Bio { get; set; }
    public Uri? AvatarUrl { get; set; }

    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public Uri? WebsiteUrl { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsVerified { get; set; } = false;

    public string? Locale { get; set; }
    public string? TimeZone { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }

    public HashSet<Guid> FriendIds { get; set; } = new();
    public HashSet<Guid> EingetrageneVeranstaltungIds { get; set; } = new();

    public bool AddFriend(User other)
    {
        if (other is null) throw new ArgumentNullException(nameof(other));
        if (other.Id == Id) return false;

        var a = FriendIds.Add(other.Id);
        var b = other.FriendIds.Add(Id);
        return a || b;
    }

    public bool RemoveFriend(User other)
    {
        if (other is null) throw new ArgumentNullException(nameof(other));
        if (other.Id == Id) return false;

        var a = FriendIds.Remove(other.Id);
        var b = other.FriendIds.Remove(Id);
        return a || b;
    }

    public bool Eintragen(Veranstaltung veranstaltung)
    {
        if (veranstaltung is null) throw new ArgumentNullException(nameof(veranstaltung));
        if (!IsActive) return false;
        if (veranstaltung.Status != VeranstaltungStatus.Published) return false;
        if (veranstaltung.EndetAm <= DateTimeOffset.UtcNow) return false;

        var userAdded = EingetrageneVeranstaltungIds.Add(veranstaltung.Id);
        var eventAdded = veranstaltung.TeilnehmerIds.Add(Id);
        return userAdded || eventAdded;
    }

    public bool Austragen(Veranstaltung veranstaltung)
    {
        if (veranstaltung is null) throw new ArgumentNullException(nameof(veranstaltung));

        var userRemoved = EingetrageneVeranstaltungIds.Remove(veranstaltung.Id);
        var eventRemoved = veranstaltung.TeilnehmerIds.Remove(Id);
        return userRemoved || eventRemoved;
    }
}

